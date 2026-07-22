(() => {
  "use strict";

  const STORAGE_KEYS = {
    subscriptions: "coremedia_subscriptions_v1",
    trash: "coremedia_deleted_subscriptions_v1",
    settings: "coremedia_settings_v1",
    demoLoaded: "coremedia_demo_loaded_v1",
    authSession: "coremedia_auth_session_v1",
    rememberedAuth: "coremedia_remembered_auth_v1",
    loginAttempts: "coremedia_login_attempts_v1"
  };
  const STATUS_LABELS = { active:"نشط", warning:"تحذير", urgent:"عاجل", expired:"منتهي", stopped:"متوقف" };
  const CYCLE_LABELS = { monthly:"شهري", annual:"سنوي", custom:"مخصص" };
  const DEFAULT_LOGIN_PASSWORD_HASH = "3320acd11c05ce5957d3ed49194ab11c76cd70766f6b30f6f9420eeaae0c804b";
  const DEFAULT_SETTINGS = {
    whatsappNumber:"201125643485", browserNotifications:false, soundEnabled:false,
    pinEnabled:false, pinHash:"", autoLockMinutes:0, theme:"light", hideSensitivePrint:true,
    loginUsername:"admin", loginPasswordHash:DEFAULT_LOGIN_PASSWORD_HASH
  };

  let subscriptions = [];
  let deletedSubscriptions = [];
  let settings = { ...DEFAULT_SETTINGS };
  let currentView = "dashboard";
  let currentPreset = "all";
  let calendarCursor = new Date();
  let charts = {};
  let activeNotifications = [];
  let inactivityTimer = null;
  let dashboardInterval = null;
  let appStarted = false;

  const $ = (selector, root=document) => root.querySelector(selector);
  const $$ = (selector, root=document) => [...root.querySelectorAll(selector)];

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    loadState();
    seedDemoData();
    applyTheme(settings.theme);
    bindEvents();
    populateSettings();
    updateClock();
    setInterval(updateClock, 1000);
    updateLoginCredentialHint();
    // الإصدار V2: صفحة تسجيل الدخول تظهر دائمًا أولًا عند فتح أو تحديث الموقع.
    // لا يتم تجاوزها بسبب جلسة قديمة أو بيانات محفوظة في المتصفح.
    sessionStorage.removeItem(STORAGE_KEYS.authSession);
    localStorage.removeItem(STORAGE_KEYS.rememberedAuth);
    showLoginScreen();
  }

  function loadState() {
    subscriptions = safeParse(localStorage.getItem(STORAGE_KEYS.subscriptions), []);
    deletedSubscriptions = safeParse(localStorage.getItem(STORAGE_KEYS.trash), []);
    settings = { ...DEFAULT_SETTINGS, ...safeParse(localStorage.getItem(STORAGE_KEYS.settings), {}) };
    if (!settings.loginUsername) settings.loginUsername = "admin";
    if (!settings.loginPasswordHash) settings.loginPasswordHash = DEFAULT_LOGIN_PASSWORD_HASH;
    if (!Array.isArray(subscriptions)) subscriptions = [];
    if (!Array.isArray(deletedSubscriptions)) deletedSubscriptions = [];
  }

  function safeParse(value, fallback) {
    try { return value ? JSON.parse(value) : fallback; }
    catch (error) { console.warn("تعذر قراءة البيانات المحفوظة:", error); return fallback; }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEYS.subscriptions, JSON.stringify(subscriptions));
    localStorage.setItem(STORAGE_KEYS.trash, JSON.stringify(deletedSubscriptions));
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
  }

  function seedDemoData() {
    if (localStorage.getItem(STORAGE_KEYS.demoLoaded) === "true" || subscriptions.length) return;
    const today = startOfDay(new Date());
    const addDays = days => { const d=new Date(today); d.setDate(d.getDate()+days); return toInputDate(d); };
    const startBack = days => { const d=new Date(today); d.setDate(d.getDate()-days); return toInputDate(d); };
    subscriptions = [
      demoSubscription("ChatGPT Plus","OpenAI","ذكاء اصطناعي","team@coremedia-ad.com","monthly",20,"USD",startBack(10),addDays(28),"بطاقة بنكية","أحمد","https://chatgpt.com",false),
      demoSubscription("Gemini Advanced","Google","ذكاء اصطناعي","marketing@coremedia-ad.com","monthly",75,"SAR",startBack(20),addDays(10),"بطاقة بنكية","سارة","https://gemini.google.com",true),
      demoSubscription("Adobe Creative Cloud","Adobe","تصميم","design@coremedia-ad.com","annual",600,"USD",startBack(362),addDays(3),"تحويل بنكي","عمر","https://www.adobe.com",true),
      demoSubscription("Canva Pro","Canva","تصميم","social@coremedia-ad.com","annual",120,"USD",startBack(365),addDays(0),"بطاقة بنكية","مريم","https://www.canva.com",false),
      demoSubscription("CapCut Pro","ByteDance","مونتاج","video@coremedia-ad.com","monthly",450,"EGP",startBack(35),addDays(-4),"محفظة إلكترونية","أمير","https://www.capcut.com",true),
      { ...demoSubscription("Envato Elements","Envato","تصميم","assets@coremedia-ad.com","annual",198,"USD",startBack(40),addDays(60),"PayPal","خالد","https://elements.envato.com",false), manualStatus:"stopped" }
    ];
    saveState();
    localStorage.setItem(STORAGE_KEYS.demoLoaded, "true");
  }

  function demoSubscription(name, platform, category, email, cycle, price, currency, startDate, endDate, paymentMethod, owner, website, periodicAlert) {
    const now = new Date().toISOString();
    return {
      id:createId(), isDemo:true, name, platform, category, logoUrl:"", email,
      username:email.split("@")[0], password:"", startDate, endDate, cycle, price, currency,
      paymentMethod, cardLast4:"", owner, phone:"", website, notes:"بيانات تجريبية قابلة للحذف.",
      alertsEnabled:true, alertDays:10, periodicAlert, manualStatus:"active", createdAt:now, updatedAt:now,
      lastAlertDate:"", lastPeriodicAlertDate:"", alertLog:[], renewalHistory:[]
    };
  }

  function bindEvents() {
    $("#loginForm").addEventListener("submit", handleLoginSubmit);
    $("#toggleLoginPassword").addEventListener("click", () => togglePasswordVisibility($("#loginPassword"), $("#toggleLoginPassword")));
    $("#logoutBtn").addEventListener("click", logoutUser);
    $("#openSidebar").addEventListener("click", openSidebar);
    $("#closeSidebar").addEventListener("click", closeSidebar);
    $("#sidebarOverlay").addEventListener("click", closeSidebar);
    $$(".nav-item").forEach(button => button.addEventListener("click", () => {
      showView(button.dataset.view, button.dataset.preset || "all"); closeSidebar();
    }));
    $$('[data-go-view]').forEach(button => button.addEventListener("click", () => showView(button.dataset.goView, button.dataset.preset || "all")));
    $("#addSubscriptionBtn").addEventListener("click", () => openSubscriptionModal());
    $("#quickAddBtn").addEventListener("click", () => openSubscriptionModal());
    $("#themeToggle").addEventListener("click", toggleTheme);
    $("#notificationBtn").addEventListener("click", () => $("#notificationPanel").classList.toggle("hidden"));
    $("#closeNotificationPanel").addEventListener("click", () => $("#notificationPanel").classList.add("hidden"));

    $$(".modal-close").forEach(button => button.addEventListener("click", () => closeModal(button.dataset.closeModal)));
    $$(".modal-backdrop").forEach(backdrop => backdrop.addEventListener("click", event => { if (event.target === backdrop) closeModal(backdrop.id); }));
    document.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        $$(".modal-backdrop:not(.hidden)").forEach(modal => closeModal(modal.id));
        $("#notificationPanel").classList.add("hidden");
      }
    });

    $("#subscriptionForm").addEventListener("submit", handleSubscriptionSubmit);
    $("#resetSubscriptionForm").addEventListener("click", resetSubscriptionForm);
    $("#toggleSubPassword").addEventListener("click", () => togglePasswordVisibility($("#subPassword"), $("#toggleSubPassword")));
    $("#renewForm").addEventListener("submit", handleRenewSubmit);

    ["searchInput","statusFilter","cycleFilter","currencyFilter","paymentFilter","sortFilter"].forEach(id => {
      $("#"+id).addEventListener(id === "searchInput" ? "input" : "change", renderSubscriptionsTable);
    });
    $("#resetFiltersBtn").addEventListener("click", resetFilters);
    $("#clearDemoBtn").addEventListener("click", clearDemoData);
    $("#subscriptionsTableBody").addEventListener("click", handleTableAction);
    $("#expiringList").addEventListener("click", handleGenericAction);
    $("#notificationList").addEventListener("click", handleGenericAction);
    $("#calendarDayEvents").addEventListener("click", handleGenericAction);
    $("#trashList").addEventListener("click", handleTrashAction);
    $("#detailsContent").addEventListener("click", handleDetailsAction);

    $("#exportCsvBtn").addEventListener("click", exportCSV);
    $("#printBtn").addEventListener("click", printCurrentView);
    $("#quickExportBtn").addEventListener("click", exportJSON);
    $("#reportCsvBtn").addEventListener("click", exportCSV);
    $("#reportJsonBtn").addEventListener("click", exportJSON);
    $("#reportPrintBtn").addEventListener("click", printCurrentView);
    $("#exportBackupBtn").addEventListener("click", exportBackup);
    $("#backupCsvBtn").addEventListener("click", exportCSV);
    $("#backupJsonBtn").addEventListener("click", exportJSON);
    $("#importBackupInput").addEventListener("change", importBackup);
    $("#emptyTrashBtn").addEventListener("click", emptyTrash);

    $("#calendarPrev").addEventListener("click", () => changeCalendarMonth(-1));
    $("#calendarNext").addEventListener("click", () => changeCalendarMonth(1));
    $("#calendarToday").addEventListener("click", () => { calendarCursor=new Date(); renderCalendar(); });

    $("#saveSettingsBtn").addEventListener("click", saveSettingsFromForm);
    $("#requestNotificationPermission").addEventListener("click", requestNotificationPermission);
    $("#lockNowBtn").addEventListener("click", lockSystem);
    $("#unlockBtn").addEventListener("click", unlockSystem);
    $("#unlockPin").addEventListener("keydown", event => { if (event.key === "Enter") unlockSystem(); });
    ["mousemove","keydown","click","touchstart"].forEach(name => document.addEventListener(name, resetInactivityTimer, {passive:true}));
  }


  function hasValidAuthSession() {
    return sessionStorage.getItem(STORAGE_KEYS.authSession) === "true" || localStorage.getItem(STORAGE_KEYS.rememberedAuth) === "true";
  }

  function showLoginScreen(message = "") {
    $("#appShell").classList.add("hidden");
    $("#loginScreen").classList.remove("hidden");
    $("#lockScreen").classList.add("hidden");
    $("#loginUsername").value = settings.loginUsername || "admin";
    $("#loginPassword").value = "";
    $("#loginError").textContent = message;
    $("#currentLoginUser").textContent = settings.loginUsername || "admin";
    updateLoginCredentialHint();
    setTimeout(() => $("#loginUsername").focus(), 80);
  }

  async function handleLoginSubmit(event) {
    event.preventDefault();
    const username = $("#loginUsername").value.trim();
    const password = $("#loginPassword").value;
    const error = $("#loginError");
    const button = $("#loginBtn");
    error.textContent = "";

    const attemptState = safeParse(sessionStorage.getItem(STORAGE_KEYS.loginAttempts), { count: 0, blockedUntil: 0 });
    if (attemptState.blockedUntil && Date.now() < attemptState.blockedUntil) {
      const seconds = Math.ceil((attemptState.blockedUntil - Date.now()) / 1000);
      error.textContent = `محاولات كثيرة غير صحيحة. أعد المحاولة بعد ${seconds} ثانية.`;
      return;
    }
    if (!username || !password) {
      error.textContent = "أدخل اسم المستخدم وكلمة المرور.";
      return;
    }

    button.disabled = true;
    button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جارٍ التحقق...';
    try {
      const passwordHash = await hashText(password);
      const validUser = username.toLowerCase() === String(settings.loginUsername || "admin").toLowerCase();
      const validPassword = passwordHash === settings.loginPasswordHash;
      await new Promise(resolve => setTimeout(resolve, 280));

      if (!validUser || !validPassword) {
        const count = Number(attemptState.count || 0) + 1;
        const blockedUntil = count >= 5 ? Date.now() + 60000 : 0;
        sessionStorage.setItem(STORAGE_KEYS.loginAttempts, JSON.stringify({ count: blockedUntil ? 0 : count, blockedUntil }));
        error.textContent = blockedUntil
          ? "تم إيقاف المحاولات لمدة دقيقة بسبب تكرار البيانات غير الصحيحة."
          : `اسم المستخدم أو كلمة المرور غير صحيحة. متبقي ${5 - count} محاولات.`;
        return;
      }

      sessionStorage.removeItem(STORAGE_KEYS.loginAttempts);
      // الجلسة صالحة داخل الصفحة الحالية فقط؛ عند إعادة التحميل تظهر صفحة الدخول من جديد.
      localStorage.removeItem(STORAGE_KEYS.rememberedAuth);
      sessionStorage.setItem(STORAGE_KEYS.authSession, "true");
      enterApplication(true);
    } finally {
      button.disabled = false;
      button.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> دخول إلى لوحة التحكم';
    }
  }

  function enterApplication(showWelcome = true) {
    $("#loginScreen").classList.add("hidden");
    $("#appShell").classList.remove("hidden");
    $("#currentLoginUser").textContent = settings.loginUsername || "admin";
    startApplicationServices();
    showView("dashboard");
    if (showWelcome) showToast(`مرحبًا ${settings.loginUsername}. تم تسجيل الدخول بنجاح.`, "success");
  }

  function startApplicationServices() {
    if (appStarted) return;
    appStarted = true;
    renderAll();
    checkAlerts();
    dashboardInterval = setInterval(() => {
      renderSubscriptionsTable();
      renderExpiringList();
      updateStats();
      checkAlerts(false);
    }, 60000);
    setupAutoLock();
  }

  function stopApplicationServices() {
    clearInterval(dashboardInterval);
    clearTimeout(inactivityTimer);
    dashboardInterval = null;
    appStarted = false;
  }

  function logoutUser() {
    if (!window.confirm("هل تريد تسجيل الخروج من لوحة التحكم؟")) return;
    sessionStorage.removeItem(STORAGE_KEYS.authSession);
    localStorage.removeItem(STORAGE_KEYS.rememberedAuth);
    stopApplicationServices();
    closeSidebar();
    $("#notificationPanel").classList.add("hidden");
    showLoginScreen("تم تسجيل الخروج بنجاح.");
  }

  function updateLoginCredentialHint() {
    const hint = $("#defaultLoginCredentials");
    if (!hint) return;
    const usesDefault = settings.loginUsername === "admin" && settings.loginPasswordHash === DEFAULT_LOGIN_PASSWORD_HASH;
    hint.classList.toggle("hidden", !usesDefault);
  }

  function openSidebar(){ $("#sidebar").classList.add("open"); $("#sidebarOverlay").classList.add("show"); }
  function closeSidebar(){ $("#sidebar").classList.remove("open"); $("#sidebarOverlay").classList.remove("show"); }

  function showView(view, preset="all") {
    currentView=view; currentPreset=preset;
    $$(".view-section").forEach(section => section.classList.remove("active"));
    const target=$("#view-"+view); if (target) target.classList.add("active");
    $$(".nav-item").forEach(item => {
      const exactView=item.dataset.view===view;
      const exactPreset=view!=="subscriptions" || (item.dataset.preset||"all")===preset;
      item.classList.toggle("active", exactView && exactPreset);
    });
    const titles={dashboard:"لوحة التحكم",subscriptions:"إدارة الاشتراكات",calendar:"التقويم",reports:"التقارير",settings:"الإعدادات",backup:"النسخ الاحتياطي"};
    $("#pageTitle").textContent=titles[view]||"إدارة الاشتراكات";
    if (view==="subscriptions") { applyPreset(preset); renderSubscriptionsTable(); }
    if (view==="calendar") renderCalendar();
    if (view==="reports") renderReports();
    if (view==="backup") renderTrash();
    window.scrollTo({top:0,behavior:"smooth"});
  }

  function applyPreset(preset) {
    resetFilters(false);
    const descriptions={all:"ابحث وصفِّ ورتّب جميع الاشتراكات المسجلة.",active:"الاشتراكات النشطة التي لا تحتاج إجراءً عاجلًا.",expiring:"الاشتراكات التي تنتهي خلال 10 أيام أو أقل.",expired:"الاشتراكات التي تجاوزت تاريخ الانتهاء.",monthly:"الاشتراكات ذات دورة دفع شهرية.",annual:"الاشتراكات ذات دورة دفع سنوية."};
    $("#subscriptionViewDescription").textContent=descriptions[preset]||descriptions.all;
    if (preset==="active") $("#statusFilter").value="active";
    if (preset==="expiring") $("#statusFilter").value="expiring";
    if (preset==="expired") $("#statusFilter").value="expired";
    if (preset==="monthly") $("#cycleFilter").value="monthly";
    if (preset==="annual") $("#cycleFilter").value="annual";
  }

  function updateClock() {
    const now=new Date();
    $("#currentDate").textContent=new Intl.DateTimeFormat("ar-EG",{weekday:"long",year:"numeric",month:"long",day:"numeric"}).format(now);
    $("#currentTime").textContent=new Intl.DateTimeFormat("ar-EG",{hour:"2-digit",minute:"2-digit",second:"2-digit"}).format(now);
  }

  function renderAll() {
    updatePaymentMethods(); updateStats(); renderExpiringList(); renderSubscriptionsTable();
    renderCalendar(); renderReports(); renderTrash(); renderCharts(); renderNotifications();
  }

  function updateStats() {
    const computed=subscriptions.map(sub=>({sub,status:getStatus(sub)}));
    const monthly=subscriptions.filter(s=>s.cycle==="monthly").reduce((sum,s)=>sum+Number(s.price||0),0);
    const annual=subscriptions.filter(s=>s.cycle==="annual").reduce((sum,s)=>sum+Number(s.price||0),0);
    const now=new Date();
    const renewThisMonth=subscriptions.filter(s=>{const end=parseDate(s.endDate);return end.getMonth()===now.getMonth()&&end.getFullYear()===now.getFullYear();}).length;
    $("#statTotal").textContent=subscriptions.length;
    $("#statActive").textContent=computed.filter(x=>x.status.key==="active").length;
    $("#statExpiring").textContent=computed.filter(x=>["warning","urgent"].includes(x.status.key)).length;
    $("#statExpired").textContent=computed.filter(x=>x.status.key==="expired").length;
    $("#statMonthlyCost").textContent=formatMoneySummary(monthly);
    $("#statAnnualCost").textContent=formatMoneySummary(annual);
    $("#statRenewThisMonth").textContent=renewThisMonth;
    const urgentCount=computed.filter(x=>["urgent","expired"].includes(x.status.key)).length;
    const banner=$("#dashboardAlertBanner");
    if (urgentCount) {
      banner.classList.remove("hidden");
      banner.innerHTML=`<strong><i class="fa-solid fa-triangle-exclamation"></i> يوجد ${toArabicDigits(urgentCount)} اشتراك يحتاج إجراءً عاجلًا</strong><p>راجع التنبيهات أو افتح قسم الاشتراكات القريبة من الانتهاء لإرسال رسالة واتساب أو تجديد الاشتراك.</p>`;
    } else banner.classList.add("hidden");
  }

  function formatMoneySummary(value){ return new Intl.NumberFormat("ar-EG",{maximumFractionDigits:2}).format(value); }

  function getStatus(subscription) {
    if (subscription.manualStatus==="stopped") return {key:"stopped",label:STATUS_LABELS.stopped};
    const ms=getRemainingMs(subscription.endDate); const days=Math.ceil(ms/86400000);
    if (ms<0) return {key:"expired",label:STATUS_LABELS.expired};
    if (days<=3) return {key:"urgent",label:STATUS_LABELS.urgent};
    if (days<=10) return {key:"warning",label:STATUS_LABELS.warning};
    return {key:"active",label:STATUS_LABELS.active};
  }
  function getRemainingMs(endDate){ return parseDateEnd(endDate).getTime()-Date.now(); }

  function getCountdown(endDate) {
    const ms=getRemainingMs(endDate), absolute=Math.abs(ms);
    const days=Math.floor(absolute/86400000), hours=Math.floor((absolute%86400000)/3600000), minutes=Math.floor((absolute%3600000)/60000);
    const end=parseDateEnd(endDate), today=new Date();
    if (sameDay(end,today)&&ms>=0) return {primary:"ينتهي اليوم",secondary:`${toArabicDigits(hours)} ساعة و${toArabicDigits(minutes)} دقيقة`};
    if (ms<0) return {primary:`منتهي منذ ${toArabicDigits(Math.max(1,Math.floor(absolute/86400000)))} يوم`,secondary:`${toArabicDigits(hours)} ساعة`};
    return {primary:`متبقي ${toArabicDigits(days)} يوم`,secondary:`${toArabicDigits(hours)} ساعة و${toArabicDigits(minutes)} دقيقة`};
  }

  function renderExpiringList() {
    const list=$("#expiringList");
    const expiring=subscriptions.filter(sub=>["warning","urgent","expired"].includes(getStatus(sub).key)).sort((a,b)=>parseDateEnd(a.endDate)-parseDateEnd(b.endDate)).slice(0,8);
    if (!expiring.length) { list.innerHTML=`<div class="empty-state"><i class="fa-solid fa-circle-check"></i><h3>لا توجد تجديدات عاجلة</h3><p>جميع الاشتراكات في وضع جيد حاليًا.</p></div>`; return; }
    list.innerHTML=expiring.map(sub=>{
      const countdown=getCountdown(sub.endDate);
      return `<div class="expiring-item">${serviceCell(sub)}<div class="expiring-meta"><strong>${escapeHTML(formatDate(sub.endDate))}</strong><span>${escapeHTML(countdown.primary)}</span></div><div class="expiring-meta"><strong>${escapeHTML(formatCurrency(sub.price,sub.currency))}</strong><span>قيمة التجديد</span></div><div class="button-row"><button class="btn btn-soft btn-small" data-action="renew" data-id="${sub.id}"><i class="fa-solid fa-rotate"></i> تجديد</button><button class="btn btn-primary btn-small" data-action="whatsapp" data-id="${sub.id}"><i class="fa-brands fa-whatsapp"></i> واتساب</button></div></div>`;
    }).join("");
  }

  function renderSubscriptionsTable() {
    const tbody=$("#subscriptionsTableBody"); if (!tbody) return;
    const filtered=getFilteredSubscriptions();
    $("#resultCount").textContent=`${toArabicDigits(filtered.length)} اشتراك`;
    $("#tableEmptyState").classList.toggle("hidden",filtered.length>0);
    tbody.innerHTML=filtered.map(sub=>{
      const status=getStatus(sub), countdown=getCountdown(sub.endDate);
      return `<tr class="row-${status.key}"><td>${serviceCell(sub)}</td><td class="sensitive">${escapeHTML(sub.email||"—")}</td><td>${escapeHTML(CYCLE_LABELS[sub.cycle]||sub.cycle)}</td><td>${escapeHTML(formatCurrency(sub.price,sub.currency))}</td><td>${escapeHTML(formatDate(sub.startDate))}</td><td>${escapeHTML(formatDate(sub.endDate))}</td><td><div class="countdown">${escapeHTML(countdown.primary)}<small>${escapeHTML(countdown.secondary)}</small></div></td><td><span class="status-badge status-${status.key}">${status.label}</span></td><td>${escapeHTML(sub.owner||"—")}</td><td><div class="action-menu">
        <button class="action-btn" title="عرض التفاصيل" data-action="details" data-id="${sub.id}"><i class="fa-regular fa-eye"></i></button>
        <button class="action-btn" title="تعديل" data-action="edit" data-id="${sub.id}"><i class="fa-regular fa-pen-to-square"></i></button>
        <button class="action-btn" title="تجديد" data-action="renew" data-id="${sub.id}"><i class="fa-solid fa-rotate"></i></button>
        <button class="action-btn" title="نسخ البيانات" data-action="copy" data-id="${sub.id}"><i class="fa-regular fa-copy"></i></button>
        <button class="action-btn" title="فتح رابط الخدمة" data-action="open" data-id="${sub.id}"><i class="fa-solid fa-arrow-up-right-from-square"></i></button>
        <button class="action-btn" title="إرسال تنبيه واتساب" data-action="whatsapp" data-id="${sub.id}"><i class="fa-brands fa-whatsapp"></i></button>
        <button class="action-btn" title="${sub.manualStatus==="stopped"?"استعادة":"إيقاف"}" data-action="toggle-stop" data-id="${sub.id}"><i class="fa-solid ${sub.manualStatus==="stopped"?"fa-play":"fa-pause"}"></i></button>
        <button class="action-btn danger" title="حذف" data-action="delete" data-id="${sub.id}"><i class="fa-regular fa-trash-can"></i></button>
      </div></td></tr>`;
    }).join("");
  }

  function getFilteredSubscriptions() {
    const query=($("#searchInput")?.value||"").trim().toLowerCase();
    const status=$("#statusFilter")?.value||"all", cycle=$("#cycleFilter")?.value||"all", currency=$("#currencyFilter")?.value||"all", payment=$("#paymentFilter")?.value||"all", sort=$("#sortFilter")?.value||"endAsc";
    let result=subscriptions.filter(sub=>{
      const haystack=[sub.name,sub.platform,sub.email,sub.owner,sub.category].join(" ").toLowerCase();
      const currentStatus=getStatus(sub).key;
      const statusMatch=status==="all"||currentStatus===status||(status==="expiring"&&["warning","urgent"].includes(currentStatus));
      return (!query||haystack.includes(query))&&(cycle==="all"||sub.cycle===cycle)&&(currency==="all"||sub.currency===currency)&&(payment==="all"||sub.paymentMethod===payment)&&statusMatch;
    });
    result.sort((a,b)=>{
      if (sort==="endDesc") return parseDateEnd(b.endDate)-parseDateEnd(a.endDate);
      if (sort==="priceDesc") return Number(b.price||0)-Number(a.price||0);
      if (sort==="priceAsc") return Number(a.price||0)-Number(b.price||0);
      if (sort==="nameAsc") return (a.name||"").localeCompare(b.name||"","ar");
      return parseDateEnd(a.endDate)-parseDateEnd(b.endDate);
    });
    return result;
  }

  function serviceCell(sub) {
    const initial=escapeHTML((sub.name||"?").trim().charAt(0).toUpperCase());
    const avatar=sub.logoUrl?`<div class="service-avatar"><img src="${escapeAttribute(sub.logoUrl)}" alt="" onerror="this.parentElement.textContent='${initial}'"></div>`:`<div class="service-avatar">${initial}</div>`;
    return `<div class="service-cell">${avatar}<div><strong>${escapeHTML(sub.name||"بدون اسم")}</strong><small>${escapeHTML(sub.platform||sub.category||"")}</small></div></div>`;
  }

  function handleTableAction(event){ const button=event.target.closest("[data-action]"); if(button) executeAction(button.dataset.action,button.dataset.id); }
  function handleGenericAction(event){ const button=event.target.closest("[data-action]"); if(button) executeAction(button.dataset.action,button.dataset.id); }

  function executeAction(action,id) {
    const sub=subscriptions.find(item=>item.id===id); if(!sub) return;
    if(action==="details") openDetailsModal(sub);
    else if(action==="edit") openSubscriptionModal(sub);
    else if(action==="renew") openRenewModal(sub);
    else if(action==="copy") copySubscriptionData(sub);
    else if(action==="open") openService(sub);
    else if(action==="whatsapp") sendWhatsapp(sub);
    else if(action==="toggle-stop") toggleStopped(sub);
    else if(action==="delete") deleteSubscription(sub);
    else if(action==="copy-password") copyPassword(sub);
  }

  function openSubscriptionModal(subscription=null) {
    resetSubscriptionForm();
    $("#subscriptionModalTitle").textContent=subscription?"تعديل الاشتراك":"إضافة اشتراك جديد";
    if(subscription){
      const values={subscriptionId:subscription.id,subName:subscription.name,subPlatform:subscription.platform,subCategory:subscription.category||"أخرى",subLogoUrl:subscription.logoUrl||"",subEmail:subscription.email||"",subUsername:subscription.username||"",subPassword:subscription.password||"",subStartDate:subscription.startDate||"",subEndDate:subscription.endDate||"",subCycle:subscription.cycle||"monthly",subPrice:subscription.price??"",subCurrency:subscription.currency||"EGP",subPaymentMethod:subscription.paymentMethod||"",subCardLast4:subscription.cardLast4||"",subOwner:subscription.owner||"",subPhone:subscription.phone||"",subWebsite:subscription.website||"",subNotes:subscription.notes||"",subAlertDays:subscription.alertDays??10,subManualStatus:subscription.manualStatus||"active"};
      Object.entries(values).forEach(([id,value])=>$("#"+id).value=value);
      $("#subAlertsEnabled").checked=subscription.alertsEnabled!==false;
      $("#subPeriodicAlert").checked=Boolean(subscription.periodicAlert);
    } else {
      $("#subStartDate").value=toInputDate(new Date());
      const nextMonth=new Date(); nextMonth.setMonth(nextMonth.getMonth()+1); $("#subEndDate").value=toInputDate(nextMonth);
    }
    openModal("subscriptionModal");
  }

  function resetSubscriptionForm() {
    $("#subscriptionForm").reset();
    $("#subscriptionId").value="";
    $("#subAlertsEnabled").checked=true;
    $("#subAlertDays").value=10;
    $("#subCycle").value="monthly";
    $("#subCurrency").value="EGP";
    $("#subManualStatus").value="active";
    clearValidation($("#subscriptionForm"));
  }

  function handleSubscriptionSubmit(event) {
    event.preventDefault();
    const form=event.currentTarget; clearValidation(form);
    const requiredIds=["subName","subPlatform","subEmail","subStartDate","subEndDate","subPrice","subPaymentMethod","subOwner"];
    let valid=true;
    requiredIds.forEach(id=>{ const input=$("#"+id); if(!input.value.trim()){markInvalid(input,"هذا الحقل مطلوب.");valid=false;} });
    if($("#subEmail").value&&!$("#subEmail").checkValidity()){markInvalid($("#subEmail"),"أدخل بريدًا إلكترونيًا صحيحًا.");valid=false;}
    if($("#subEndDate").value&&$("#subStartDate").value&&parseDate($("#subEndDate").value)<parseDate($("#subStartDate").value)){markInvalid($("#subEndDate"),"تاريخ الانتهاء يجب أن يكون بعد تاريخ البداية.");valid=false;}
    const card=$("#subCardLast4").value.trim();
    if(card&&!/^\d{4}$/.test(card)){markInvalid($("#subCardLast4"),"أدخل آخر أربعة أرقام فقط.");valid=false;}
    if(!valid){showToast("راجع الحقول المطلوبة والمميزة باللون الأحمر.","error");return;}

    const id=$("#subscriptionId").value, existing=subscriptions.find(sub=>sub.id===id), now=new Date().toISOString();
    const data={
      id:id||createId(), isDemo:existing?.isDemo||false,
      name:$("#subName").value.trim(), platform:$("#subPlatform").value.trim(), category:$("#subCategory").value,
      logoUrl:$("#subLogoUrl").value.trim(), email:$("#subEmail").value.trim(), username:$("#subUsername").value.trim(), password:$("#subPassword").value,
      startDate:$("#subStartDate").value, endDate:$("#subEndDate").value, cycle:$("#subCycle").value, price:Number($("#subPrice").value), currency:$("#subCurrency").value,
      paymentMethod:$("#subPaymentMethod").value.trim(), cardLast4:card, owner:$("#subOwner").value.trim(), phone:$("#subPhone").value.trim(), website:$("#subWebsite").value.trim(), notes:$("#subNotes").value.trim(),
      alertsEnabled:$("#subAlertsEnabled").checked, alertDays:Number($("#subAlertDays").value||10), periodicAlert:$("#subPeriodicAlert").checked, manualStatus:$("#subManualStatus").value,
      createdAt:existing?.createdAt||now, updatedAt:now, lastAlertDate:existing?.lastAlertDate||"", lastPeriodicAlertDate:existing?.lastPeriodicAlertDate||"", alertLog:existing?.alertLog||[], renewalHistory:existing?.renewalHistory||[]
    };
    if(existing){Object.assign(existing,data);showToast("تم تحديث بيانات الاشتراك.","success");}
    else{subscriptions.unshift(data);showToast("تمت إضافة الاشتراك بنجاح.","success");}
    saveState(); closeModal("subscriptionModal"); updatePaymentMethods(); renderAll();
  }

  function markInvalid(input,message){input.classList.add("invalid");const error=input.closest("label")?.querySelector(".field-error");if(error)error.textContent=message;}
  function clearValidation(form){$$(".invalid",form).forEach(input=>input.classList.remove("invalid"));$$(".field-error",form).forEach(error=>error.textContent="");}

  function openDetailsModal(sub) {
    const status=getStatus(sub), countdown=getCountdown(sub.endDate), renewals=sub.renewalHistory||[], alerts=sub.alertLog||[];
    $("#detailsContent").innerHTML=`
      <div class="details-hero">${serviceCell(sub)}<span class="status-badge status-${status.key}">${status.label}</span></div>
      <div class="details-grid">
        ${detailItem("البريد الإلكتروني",sub.email||"—","sensitive")}${detailItem("اسم المستخدم",sub.username||"—","sensitive")}${detailItem("كلمة المرور",sub.password?"••••••••":"غير مسجلة","sensitive")}${detailItem("آخر أرقام البطاقة",sub.cardLast4?`•••• ${sub.cardLast4}`:"—","sensitive")}
        ${detailItem("نوع الاشتراك",CYCLE_LABELS[sub.cycle]||"—")}${detailItem("القيمة",formatCurrency(sub.price,sub.currency))}${detailItem("تاريخ البداية",formatDate(sub.startDate))}${detailItem("تاريخ الانتهاء",formatDate(sub.endDate))}
        ${detailItem("الوقت المتبقي",`${countdown.primary} — ${countdown.secondary}`)}${detailItem("طريقة الدفع",sub.paymentMethod||"—")}${detailItem("المسؤول",sub.owner||"—")}${detailItem("الهاتف",sub.phone||"—")}
        ${detailItem("التصنيف",sub.category||"—")}${detailItem("التنبيه الدوري",sub.periodicAlert?"مفعل كل 10 أيام":"غير مفعل")}
        <div class="detail-item span-2"><span>الملاحظات</span><strong>${escapeHTML(sub.notes||"لا توجد ملاحظات")}</strong></div>
      </div>
      <div class="details-actions"><button class="btn btn-soft btn-small" data-action="copy-password" data-id="${sub.id}"><i class="fa-regular fa-copy"></i> نسخ كلمة المرور</button><button class="btn btn-soft btn-small" data-action="edit" data-id="${sub.id}"><i class="fa-regular fa-pen-to-square"></i> تعديل</button><button class="btn btn-soft btn-small" data-action="renew" data-id="${sub.id}"><i class="fa-solid fa-rotate"></i> تجديد</button><button class="btn btn-primary btn-small" data-action="whatsapp" data-id="${sub.id}"><i class="fa-brands fa-whatsapp"></i> إرسال واتساب</button></div>
      <div class="history-block"><h3>سجل التجديدات (${toArabicDigits(renewals.length)})</h3><div class="history-list">${renewals.length?renewals.slice().reverse().map(item=>`<div class="history-item"><strong>${escapeHTML(formatDate(item.renewDate))}</strong> — انتهاء جديد: ${escapeHTML(formatDate(item.newEndDate))} — ${escapeHTML(formatCurrency(item.price,sub.currency))} — ${item.paid?"مدفوع":"غير مدفوع"}<br>${escapeHTML(item.notes||"")}</div>`).join(""):"<p class='empty-state'>لا توجد عمليات تجديد مسجلة.</p>"}</div></div>
      <div class="history-block"><h3>سجل التنبيهات (${toArabicDigits(alerts.length)})</h3><div class="history-list">${alerts.length?alerts.slice(-8).reverse().map(item=>`<div class="history-item">${escapeHTML(formatDateTime(item.date))} — ${escapeHTML(item.type||"تنبيه")}</div>`).join(""):"<p class='empty-state'>لا توجد تنبيهات مرسلة.</p>"}</div></div>`;
    openModal("detailsModal");
  }

  function detailItem(label,value,className=""){return `<div class="detail-item ${className}"><span>${escapeHTML(label)}</span><strong>${escapeHTML(String(value))}</strong></div>`;}
  function handleDetailsAction(event){const button=event.target.closest("[data-action]");if(!button)return;const action=button.dataset.action,id=button.dataset.id;closeModal("detailsModal");executeAction(action,id);}

  function openRenewModal(sub) {
    $("#renewSubscriptionId").value=sub.id; $("#renewSubscriptionName").textContent=sub.name; $("#renewDate").value=toInputDate(new Date());
    const nextEnd=parseDate(sub.endDate);
    if(sub.cycle==="annual")nextEnd.setFullYear(nextEnd.getFullYear()+1);else nextEnd.setMonth(nextEnd.getMonth()+1);
    if(nextEnd<new Date()){const now=new Date();if(sub.cycle==="annual")now.setFullYear(now.getFullYear()+1);else now.setMonth(now.getMonth()+1);$("#renewEndDate").value=toInputDate(now);}else $("#renewEndDate").value=toInputDate(nextEnd);
    $("#renewPrice").value=sub.price; $("#renewPaymentMethod").value=sub.paymentMethod||""; $("#renewNotes").value=""; $("#renewPaid").checked=true;
    openModal("renewModal");
  }

  function handleRenewSubmit(event) {
    event.preventDefault();
    const sub=subscriptions.find(item=>item.id===$("#renewSubscriptionId").value); if(!sub)return;
    if(!$("#renewDate").value||!$("#renewEndDate").value||!$("#renewPrice").value||!$("#renewPaymentMethod").value.trim()){showToast("أكمل حقول التجديد المطلوبة.","error");return;}
    if(parseDate($("#renewEndDate").value)<parseDate($("#renewDate").value)){showToast("تاريخ الانتهاء الجديد يجب أن يكون بعد تاريخ التجديد.","error");return;}
    const historyItem={id:createId(),renewDate:$("#renewDate").value,previousEndDate:sub.endDate,newEndDate:$("#renewEndDate").value,price:Number($("#renewPrice").value),paymentMethod:$("#renewPaymentMethod").value.trim(),notes:$("#renewNotes").value.trim(),paid:$("#renewPaid").checked,actor:sub.owner||"المستخدم المحلي",createdAt:new Date().toISOString()};
    sub.renewalHistory=sub.renewalHistory||[]; sub.renewalHistory.push(historyItem); sub.endDate=historyItem.newEndDate; sub.price=historyItem.price; sub.paymentMethod=historyItem.paymentMethod; sub.manualStatus="active"; sub.updatedAt=new Date().toISOString(); sub.lastAlertDate="";
    saveState(); closeModal("renewModal"); renderAll(); showToast(`تم تجديد اشتراك ${sub.name}.`,"success");
  }

  function copySubscriptionData(sub) {
    const text=[`الاشتراك: ${sub.name}`,`المنصة: ${sub.platform}`,`البريد: ${sub.email||"—"}`,`اسم المستخدم: ${sub.username||"—"}`,`تاريخ الانتهاء: ${formatDate(sub.endDate)}`,`القيمة: ${formatCurrency(sub.price,sub.currency)}`,`المسؤول: ${sub.owner||"—"}`,`الرابط: ${sub.website||"—"}`,"كلمة المرور: مخفية لأسباب أمنية"].join("\n");
    copyText(text,"تم نسخ بيانات الاشتراك بدون كلمة المرور.");
  }

  function copyPassword(sub) {
    if(!sub.password){showToast("لا توجد كلمة مرور مسجلة لهذا الاشتراك.","warning");return;}
    if(window.confirm("تحذير أمني: سيتم نسخ كلمة المرور إلى الحافظة وقد تتمكن تطبيقات أخرى من قراءتها. هل تريد المتابعة؟")) copyText(sub.password,"تم نسخ كلمة المرور. امسح الحافظة بعد الاستخدام.");
  }

  async function copyText(text,message) {
    try{await navigator.clipboard.writeText(text);showToast(message,"success");}
    catch{const textarea=document.createElement("textarea");textarea.value=text;document.body.appendChild(textarea);textarea.select();document.execCommand("copy");textarea.remove();showToast(message,"success");}
  }

  function openService(sub) {
    if(!sub.website){showToast("لا يوجد رابط خدمة مسجل.","warning");return;}
    try{const url=new URL(sub.website);if(!["http:","https:"].includes(url.protocol))throw new Error();window.open(url.href,"_blank","noopener,noreferrer");}
    catch{showToast("رابط الخدمة غير صالح.","error");}
  }

  function sendWhatsapp(sub) {
    const countdown=getCountdown(sub.endDate);
    const message=`تنبيه من نظام CoreMedia Ad لإدارة الاشتراكات\n\nالاشتراك: ${sub.name}\nتاريخ الانتهاء: ${formatDate(sub.endDate)}\nالمدة المتبقية: ${countdown.primary}\nقيمة التجديد: ${formatCurrency(sub.price,sub.currency)}\nالحساب: ${sub.email||sub.username||"غير مسجل"}\nرابط الخدمة: ${sub.website||"غير مسجل"}\n\nيرجى مراجعة الاشتراك وتجديده قبل موعد الانتهاء.`;
    window.open(`https://wa.me/${settings.whatsappNumber}?text=${encodeURIComponent(message)}`,"_blank","noopener,noreferrer");
    const now=new Date().toISOString(); sub.lastAlertDate=now; if(sub.periodicAlert)sub.lastPeriodicAlertDate=now; sub.alertLog=sub.alertLog||[]; sub.alertLog.push({date:now,type:"تنبيه واتساب يدوي"});
    saveState(); renderNotifications(); showToast("تم تجهيز رسالة واتساب وتسجيل وقت التنبيه.","success");
  }

  function toggleStopped(sub){sub.manualStatus=sub.manualStatus==="stopped"?"active":"stopped";sub.updatedAt=new Date().toISOString();saveState();renderAll();showToast(sub.manualStatus==="stopped"?"تم إيقاف الاشتراك.":"تمت استعادة الاشتراك.","success");}

  function deleteSubscription(sub) {
    if(!window.confirm(`سيتم نقل اشتراك "${sub.name}" إلى سلة المحذوفات. هل تريد المتابعة؟`))return;
    subscriptions=subscriptions.filter(item=>item.id!==sub.id); deletedSubscriptions.unshift({...sub,deletedAt:new Date().toISOString()}); saveState(); renderAll(); showToast("تم نقل الاشتراك إلى سلة المحذوفات.","success");
  }

  function clearDemoData() {
    const count=subscriptions.filter(sub=>sub.isDemo).length;
    if(!count){showToast("لا توجد بيانات تجريبية حاليًا.","warning");return;}
    if(!window.confirm(`سيتم حذف ${count} اشتراك تجريبي. هل تريد المتابعة؟`))return;
    subscriptions=subscriptions.filter(sub=>!sub.isDemo); saveState(); renderAll(); showToast("تم حذف جميع البيانات التجريبية.","success");
  }

  function resetFilters(render=true) {
    if($("#searchInput"))$("#searchInput").value="";
    if($("#statusFilter"))$("#statusFilter").value="all";
    if($("#cycleFilter"))$("#cycleFilter").value="all";
    if($("#currencyFilter"))$("#currencyFilter").value="all";
    if($("#paymentFilter"))$("#paymentFilter").value="all";
    if($("#sortFilter"))$("#sortFilter").value="endAsc";
    if(render)renderSubscriptionsTable();
  }

  function updatePaymentMethods() {
    const select=$("#paymentFilter"); if(!select)return; const current=select.value;
    const methods=[...new Set(subscriptions.map(sub=>sub.paymentMethod).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"ar"));
    select.innerHTML=`<option value="all">كل طرق الدفع</option>`+methods.map(method=>`<option value="${escapeAttribute(method)}">${escapeHTML(method)}</option>`).join("");
    if(methods.includes(current))select.value=current;
  }

  function renderCalendar() {
    const grid=$("#calendarGrid"); if(!grid)return;
    const year=calendarCursor.getFullYear(), month=calendarCursor.getMonth();
    $("#calendarTitle").textContent=new Intl.DateTimeFormat("ar-EG",{month:"long",year:"numeric"}).format(calendarCursor);
    const first=new Date(year,month,1), start=new Date(year,month,1-first.getDay()), cells=[];
    for(let i=0;i<42;i++){
      const date=new Date(start);date.setDate(start.getDate()+i);const dateKey=toInputDate(date);const events=subscriptions.filter(sub=>sub.endDate===dateKey);const classes=["calendar-day"];
      if(date.getMonth()!==month)classes.push("outside");if(sameDay(date,new Date()))classes.push("today");
      cells.push(`<button class="${classes.join(" ")}" data-calendar-date="${dateKey}"><span class="day-number">${toArabicDigits(date.getDate())}</span>${events.slice(0,3).map(sub=>`<span class="calendar-event ${getStatus(sub).key}" title="${escapeAttribute(sub.name)}">${escapeHTML(sub.name)}</span>`).join("")}${events.length>3?`<span class="calendar-event">+${toArabicDigits(events.length-3)}</span>`:""}</button>`);
    }
    grid.innerHTML=cells.join("");
    $$("[data-calendar-date]",grid).forEach(day=>day.addEventListener("click",()=>renderCalendarDay(day.dataset.calendarDate)));
  }

  function renderCalendarDay(dateKey) {
    const events=subscriptions.filter(sub=>sub.endDate===dateKey);
    $("#calendarDayTitle").textContent=new Intl.DateTimeFormat("ar-EG",{weekday:"long",year:"numeric",month:"long",day:"numeric"}).format(parseDate(dateKey));
    $("#calendarDayEvents").innerHTML=events.length?events.map(sub=>`<div class="day-event-row">${serviceCell(sub)}<div class="button-row"><span class="status-badge status-${getStatus(sub).key}">${getStatus(sub).label}</span><button class="btn btn-soft btn-small" data-action="details" data-id="${sub.id}">التفاصيل</button></div></div>`).join(""):`<div class="empty-state"><i class="fa-regular fa-calendar-xmark"></i><h3>لا توجد أحداث</h3><p>لا يوجد اشتراك ينتهي في هذا اليوم.</p></div>`;
  }
  function changeCalendarMonth(amount){calendarCursor.setMonth(calendarCursor.getMonth()+amount);renderCalendar();}

  function renderReports() {
    if(!$("#reportTableBody"))return;
    const now=new Date(), currentMonth=now.getMonth(), currentYear=now.getFullYear();
    const paidRenewals=subscriptions.flatMap(sub=>(sub.renewalHistory||[]).map(item=>({...item,subscription:sub}))).filter(item=>{const date=parseDate(item.renewDate);return item.paid&&date.getMonth()===currentMonth&&date.getFullYear()===currentYear;});
    const expenses=paidRenewals.reduce((sum,item)=>sum+Number(item.price||0),0);
    const needsRenewal=subscriptions.filter(sub=>["warning","urgent","expired"].includes(getStatus(sub).key)).length;
    const expired=subscriptions.filter(sub=>getStatus(sub).key==="expired").length;
    const newThisMonth=subscriptions.filter(sub=>{const date=new Date(sub.createdAt);return date.getMonth()===currentMonth&&date.getFullYear()===currentYear;}).length;
    $("#reportPaid").textContent=paidRenewals.length;$("#reportNeedsRenewal").textContent=needsRenewal;$("#reportExpenses").textContent=formatMoneySummary(expenses);$("#reportExpired").textContent=expired;$("#reportNew").textContent=newThisMonth;
    $("#reportMonthLabel").textContent=new Intl.DateTimeFormat("ar-EG",{month:"long",year:"numeric"}).format(now);
    $("#reportTableBody").innerHTML=subscriptions.slice().sort((a,b)=>parseDateEnd(a.endDate)-parseDateEnd(b.endDate)).map(sub=>{const status=getStatus(sub);return `<tr><td>${serviceCell(sub)}</td><td><span class="status-badge status-${status.key}">${status.label}</span></td><td>${escapeHTML(formatCurrency(sub.price,sub.currency))}</td><td>${escapeHTML(formatDate(sub.endDate))}</td><td>${escapeHTML(sub.owner||"—")}</td></tr>`;}).join("");
    const renewalsCount=subscriptions.reduce((sum,sub)=>sum+(sub.renewalHistory||[]).length,0);
    $("#renewalIndicators").innerHTML=`<div class="indicator"><strong>${toArabicDigits(renewalsCount)}</strong><span>إجمالي عمليات التجديد المسجلة</span></div><div class="indicator"><strong>${toArabicDigits(paidRenewals.length)}</strong><span>عمليات مدفوعة هذا الشهر</span></div><div class="indicator"><strong>${toArabicDigits(expired)}</strong><span>اشتراكات انتهت وتحتاج قرارًا</span></div>`;
    renderCharts();
  }

  function renderCharts() {
    if(typeof Chart==="undefined")return;
    const isDark=document.body.classList.contains("dark");Chart.defaults.color=isDark?"#dce6fb":"#66708c";Chart.defaults.font.family="Alexandria";
    const statusCounts=["active","warning","urgent","expired","stopped"].map(key=>subscriptions.filter(sub=>getStatus(sub).key===key).length);
    updateChart("statusChart",{type:"doughnut",data:{labels:["نشط","تحذير","عاجل","منتهي","متوقف"],datasets:[{data:statusCounts,backgroundColor:["#15a76d","#f59e0b","#e84a5f","#a51e38","#6b7280"],borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,cutout:"68%",plugins:{legend:{position:"bottom",labels:{boxWidth:10,usePointStyle:true}}}}});
    const monthly=subscriptions.filter(s=>s.cycle==="monthly").reduce((sum,s)=>sum+Number(s.price||0),0),annual=subscriptions.filter(s=>s.cycle==="annual").reduce((sum,s)=>sum+Number(s.price||0),0),custom=subscriptions.filter(s=>s.cycle==="custom").reduce((sum,s)=>sum+Number(s.price||0),0);
    updateChart("expenseChart",{type:"bar",data:{labels:["شهرية","سنوية","مخصصة"],datasets:[{label:"إجمالي القيم المسجلة",data:[monthly,annual,custom],backgroundColor:["#2487ff","#6747f5","#03c8bd"],borderRadius:10}]},options:{responsive:true,maintainAspectRatio:false,scales:{y:{beginAtZero:true,grid:{color:isDark?"#20304c":"#edf0f6"}},x:{grid:{display:false}}},plugins:{legend:{display:false}}}});
    const top=subscriptions.slice().sort((a,b)=>Number(b.price||0)-Number(a.price||0)).slice(0,6);
    updateChart("topServicesChart",{type:"bar",data:{labels:top.map(s=>s.name),datasets:[{data:top.map(s=>Number(s.price||0)),backgroundColor:"#42b7ff",borderRadius:9}]},options:{indexAxis:"y",responsive:true,maintainAspectRatio:false,scales:{x:{beginAtZero:true,grid:{color:isDark?"#20304c":"#edf0f6"}},y:{grid:{display:false}}},plugins:{legend:{display:false}}}});
  }
  function updateChart(canvasId,config){const canvas=$("#"+canvasId);if(!canvas)return;if(charts[canvasId])charts[canvasId].destroy();charts[canvasId]=new Chart(canvas,config);}

  function checkAlerts(showBrowser=true) {
    const todayKey=toInputDate(new Date()), now=new Date(), generated=[];
    subscriptions.forEach(sub=>{
      if(sub.alertsEnabled!==false&&sub.manualStatus!=="stopped"){
        const remainingDays=Math.ceil(getRemainingMs(sub.endDate)/86400000), thresholdDays=[10,5,3,1,0], alertKey=`${todayKey}:expiry:${remainingDays}`;sub.alertLog=sub.alertLog||[];
        if(thresholdDays.includes(remainingDays)){
          generated.push({id:`${sub.id}-expiry`,subscriptionId:sub.id,type:remainingDays<=3?"urgent":"warning",title:`تنبيه انتهاء: ${sub.name}`,message:remainingDays===0?"ينتهي الاشتراك اليوم.":`متبقي ${remainingDays} أيام على انتهاء الاشتراك.`});
          if(!sub.alertLog.some(item=>item.key===alertKey)){sub.alertLog.push({key:alertKey,date:now.toISOString(),type:`تنبيه انتهاء قبل ${remainingDays} يوم`});sub.lastAlertDate=now.toISOString();if(showBrowser)notifyUser(`تنبيه اشتراك ${sub.name}`,remainingDays===0?"ينتهي اليوم":`متبقي ${remainingDays} أيام`);}
        }
      }
      if(sub.periodicAlert){const last=sub.lastPeriodicAlertDate?new Date(sub.lastPeriodicAlertDate):new Date(sub.createdAt||0);const elapsedDays=Math.floor((now-last)/86400000);if(elapsedDays>=10)generated.push({id:`${sub.id}-periodic`,subscriptionId:sub.id,type:"warning",title:`حان موعد مراجعة اشتراك ${sub.name}.`,message:`مرّ ${elapsedDays} يومًا منذ آخر تنبيه دوري.`});}
    });
    activeNotifications=generated;saveState();renderNotifications();updateStats();
  }

  function renderNotifications() {
    const list=$("#notificationList"),count=activeNotifications.length;$("#notificationCount").textContent=count;$("#notificationCount").classList.toggle("hidden",count===0);
    if(!count){list.innerHTML=`<div class="empty-state"><i class="fa-regular fa-bell-slash"></i><h3>لا توجد تنبيهات جديدة</h3><p>ستظهر هنا التنبيهات المستحقة.</p></div>`;return;}
    list.innerHTML=activeNotifications.map(item=>`<div class="notification-item ${item.type}"><strong>${escapeHTML(item.title)}</strong><p>${escapeHTML(item.message)}</p><button class="btn btn-primary btn-small" data-action="whatsapp" data-id="${item.subscriptionId}"><i class="fa-brands fa-whatsapp"></i> إرسال التنبيه عبر واتساب</button></div>`).join("");
  }

  function notifyUser(title,body) {
    if(settings.soundEnabled)playAlertSound();
    if(!settings.browserNotifications||!("Notification" in window)||Notification.permission!=="granted")return;
    try{new Notification(title,{body,icon:"assets/logo.png",tag:title});}catch(error){console.warn("تعذر إظهار إشعار المتصفح:",error);}
  }

  function playAlertSound() {
    try{const AudioContextClass=window.AudioContext||window.webkitAudioContext,context=new AudioContextClass(),oscillator=context.createOscillator(),gain=context.createGain();oscillator.frequency.value=720;gain.gain.setValueAtTime(.08,context.currentTime);gain.gain.exponentialRampToValueAtTime(.001,context.currentTime+.35);oscillator.connect(gain);gain.connect(context.destination);oscillator.start();oscillator.stop(context.currentTime+.35);}catch(error){console.warn("تعذر تشغيل صوت التنبيه:",error);}
  }

  async function requestNotificationPermission() {
    if(!("Notification" in window)){showToast("هذا المتصفح لا يدعم إشعارات النظام.","warning");return;}
    const permission=await Notification.requestPermission();settings.browserNotifications=permission==="granted";$("#settingsBrowserNotifications").checked=settings.browserNotifications;saveState();showToast(permission==="granted"?"تم تفعيل إشعارات المتصفح.":"لم يتم منح إذن الإشعارات.",permission==="granted"?"success":"warning");
  }

  function populateSettings() {
    $("#settingsWhatsapp").value=settings.whatsappNumber;$("#settingsBrowserNotifications").checked=settings.browserNotifications;$("#settingsSound").checked=settings.soundEnabled;$("#settingsPinEnabled").checked=settings.pinEnabled;$("#settingsAutoLock").value=String(settings.autoLockMinutes||0);$("#settingsTheme").value=settings.theme;$("#settingsHideSensitivePrint").checked=settings.hideSensitivePrint;$("#settingsLoginUsername").value=settings.loginUsername||"admin";$("#settingsLoginPassword").value="";$("#settingsLoginPasswordConfirm").value="";document.body.classList.toggle("hide-sensitive-print",settings.hideSensitivePrint);
  }

  async function saveSettingsFromForm() {
    const whatsapp=$("#settingsWhatsapp").value.trim();if(!/^\d{10,15}$/.test(whatsapp)){showToast("رقم واتساب يجب أن يحتوي على أرقام دولية فقط، مثل 201125643485.","error");return;}
    const loginUsername=$("#settingsLoginUsername").value.trim(),loginPassword=$("#settingsLoginPassword").value,loginPasswordConfirm=$("#settingsLoginPasswordConfirm").value;
    if(loginUsername.length<3){showToast("اسم المستخدم يجب أن يتكون من ثلاثة أحرف على الأقل.","error");return;}
    if(loginPassword&&loginPassword.length<8){showToast("كلمة مرور تسجيل الدخول يجب أن تتكون من ثمانية أحرف على الأقل.","error");return;}
    if(loginPassword!==loginPasswordConfirm){showToast("تأكيد كلمة مرور تسجيل الدخول غير مطابق.","error");return;}
    const pinEnabled=$("#settingsPinEnabled").checked,newPin=$("#settingsPin").value.trim();
    if(pinEnabled&&!settings.pinHash&&!/^\d{4,8}$/.test(newPin)){showToast("أدخل رمز PIN من 4 إلى 8 أرقام.","error");return;}
    if(newPin&&!/^\d{4,8}$/.test(newPin)){showToast("رمز PIN يجب أن يتكون من 4 إلى 8 أرقام.","error");return;}
    settings.whatsappNumber=whatsapp;settings.browserNotifications=$("#settingsBrowserNotifications").checked;settings.soundEnabled=$("#settingsSound").checked;settings.pinEnabled=pinEnabled;settings.autoLockMinutes=Number($("#settingsAutoLock").value);settings.theme=$("#settingsTheme").value;settings.hideSensitivePrint=$("#settingsHideSensitivePrint").checked;settings.loginUsername=loginUsername;
    if(loginPassword)settings.loginPasswordHash=await hashText(loginPassword);if(newPin)settings.pinHash=await hashText(newPin);if(!pinEnabled)settings.pinHash="";
    saveState();applyTheme(settings.theme);document.body.classList.toggle("hide-sensitive-print",settings.hideSensitivePrint);$("#settingsPin").value="";$("#settingsLoginPassword").value="";$("#settingsLoginPasswordConfirm").value="";$("#currentLoginUser").textContent=settings.loginUsername;updateLoginCredentialHint();setupAutoLock();showToast("تم حفظ الإعدادات وبيانات تسجيل الدخول.","success");
  }

  function toggleTheme(){settings.theme=document.body.classList.contains("dark")?"light":"dark";saveState();applyTheme(settings.theme);$("#settingsTheme").value=settings.theme;}
  function applyTheme(theme){document.body.classList.toggle("dark",theme==="dark");const icon=$("#themeToggle i");if(icon)icon.className=theme==="dark"?"fa-solid fa-sun":"fa-solid fa-moon";setTimeout(renderCharts,0);}

  function lockSystem() {
    if(!settings.pinEnabled||!settings.pinHash){showToast("فعّل رمز PIN أولًا من الإعدادات.","warning");showView("settings");return;}
    $("#lockScreen").classList.remove("hidden");$("#unlockPin").value="";$("#unlockError").textContent="";setTimeout(()=>$("#unlockPin").focus(),50);
  }

  async function unlockSystem() {
    const hash=await hashText($("#unlockPin").value.trim());if(hash!==settings.pinHash){$("#unlockError").textContent="رمز PIN غير صحيح.";return;}
    $("#lockScreen").classList.add("hidden");$("#unlockError").textContent="";resetInactivityTimer();showToast("تم فتح النظام.","success");
  }

  async function hashText(value) {
    if(window.crypto?.subtle){
      const data=new TextEncoder().encode(value),hash=await crypto.subtle.digest("SHA-256",data);
      return [...new Uint8Array(hash)].map(byte=>byte.toString(16).padStart(2,"0")).join("");
    }
    return sha256Fallback(String(value));
  }

  // تنفيذ SHA-256 محلي حتى تعمل صفحة الدخول عند فتح index.html مباشرة دون خادم.
  function sha256Fallback(ascii) {
    const rightRotate=(value,amount)=>(value>>>amount)|(value<<(32-amount));
    const mathPow=Math.pow,maxWord=mathPow(2,32),lengthProperty="length";
    let i,j,result="",words=[],asciiBitLength=ascii[lengthProperty]*8;
    let hash=sha256Fallback.h=sha256Fallback.h||[];
    const k=sha256Fallback.k=sha256Fallback.k||[];
    let primeCounter=k[lengthProperty],isComposite={};
    for(let candidate=2;primeCounter<64;candidate++){
      if(!isComposite[candidate]){
        for(i=0;i<313;i+=candidate)isComposite[i]=candidate;
        hash[primeCounter]=(mathPow(candidate,.5)*maxWord)|0;
        k[primeCounter++]=(mathPow(candidate,1/3)*maxWord)|0;
      }
    }
    ascii+="\x80";
    while(ascii[lengthProperty]%64-56)ascii+="\x00";
    for(i=0;i<ascii[lengthProperty];i++){
      j=ascii.charCodeAt(i);
      if(j>>8)return "";
      words[i>>2]|=j<<((3-i)%4)*8;
    }
    words[words[lengthProperty]]=(asciiBitLength/maxWord)|0;
    words[words[lengthProperty]]=asciiBitLength;
    for(j=0;j<words[lengthProperty];){
      const w=words.slice(j,j+=16),oldHash=hash.slice(0);
      for(i=0;i<64;i++){
        const w15=w[i-15],w2=w[i-2];
        const a=hash[0],e=hash[4];
        const temp1=hash[7]+(rightRotate(e,6)^rightRotate(e,11)^rightRotate(e,25))+((e&hash[5])^((~e)&hash[6]))+k[i]+(w[i]=(i<16)?w[i]:((w[i-16]+(rightRotate(w15,7)^rightRotate(w15,18)^(w15>>>3))+w[i-7]+(rightRotate(w2,17)^rightRotate(w2,19)^(w2>>>10)))|0));
        const temp2=(rightRotate(a,2)^rightRotate(a,13)^rightRotate(a,22))+((a&hash[1])^(a&hash[2])^(hash[1]&hash[2]));
        hash=[(temp1+temp2)|0,a,hash[1],hash[2],(hash[3]+temp1)|0,e,hash[5],hash[6]];
      }
      for(i=0;i<8;i++)hash[i]=(hash[i]+oldHash[i])|0;
    }
    for(i=0;i<8;i++)for(j=3;j+1;j--){const b=(hash[i]>>(j*8))&255;result+=(b<16?"0":"")+b.toString(16);}
    return result;
  }

  function setupAutoLock(){clearTimeout(inactivityTimer);resetInactivityTimer();}
  function resetInactivityTimer(){clearTimeout(inactivityTimer);if(!appStarted||!settings.pinEnabled||!settings.autoLockMinutes)return;inactivityTimer=setTimeout(lockSystem,settings.autoLockMinutes*60000);}

  function exportBackup() {
    const payload={app:"CoreMedia Ad Subscription Manager",version:1,exportedAt:new Date().toISOString(),subscriptions,deletedSubscriptions,settings:{...settings,pinHash:"",loginPasswordHash:""}};
    downloadFile(`coremedia-backup-${toInputDate(new Date())}.json`,JSON.stringify(payload,null,2),"application/json");showToast("تم تصدير النسخة الاحتياطية.","success");
  }
  function exportJSON(){downloadFile(`coremedia-subscriptions-${toInputDate(new Date())}.json`,JSON.stringify({exportedAt:new Date().toISOString(),subscriptions},null,2),"application/json");}

  function exportCSV() {
    const rows=getFilteredSubscriptions(),headers=["الاشتراك","المنصة","البريد","النوع","القيمة","العملة","البداية","الانتهاء","الحالة","المسؤول","طريقة الدفع","الرابط"];
    const dataRows=rows.map(sub=>[sub.name,sub.platform,sub.email,CYCLE_LABELS[sub.cycle]||sub.cycle,sub.price,sub.currency,sub.startDate,sub.endDate,STATUS_LABELS[getStatus(sub).key],sub.owner,sub.paymentMethod,sub.website]);
    const csv="\uFEFF"+[headers,...dataRows].map(row=>row.map(csvEscape).join(",")).join("\n");downloadFile(`coremedia-subscriptions-${toInputDate(new Date())}.csv`,csv,"text/csv;charset=utf-8");
  }
  function csvEscape(value){return `"${String(value??"").replace(/"/g,'""')}"`;}

  async function importBackup(event) {
    const input=event.target,file=input.files?.[0];if(!file)return;
    try{
      const payload=JSON.parse(await file.text());if(!payload||!Array.isArray(payload.subscriptions))throw new Error("صيغة الملف غير صحيحة.");
      if(!payload.subscriptions.every(item=>item.id&&item.name&&item.endDate))throw new Error("بعض الاشتراكات داخل الملف غير صالحة.");
      if(!window.confirm(`سيتم استبدال البيانات الحالية واستيراد ${payload.subscriptions.length} اشتراك. هل تريد المتابعة؟`))return;
      subscriptions=payload.subscriptions;deletedSubscriptions=Array.isArray(payload.deletedSubscriptions)?payload.deletedSubscriptions:[];
      if(payload.settings&&typeof payload.settings==="object"){const preservedPin=settings.pinHash,preservedLoginUsername=settings.loginUsername,preservedLoginPasswordHash=settings.loginPasswordHash;settings={...DEFAULT_SETTINGS,...payload.settings,pinHash:preservedPin,loginUsername:preservedLoginUsername,loginPasswordHash:preservedLoginPasswordHash};}
      saveState();populateSettings();renderAll();showToast("تم استيراد النسخة الاحتياطية بنجاح.","success");
    }catch(error){showToast(error.message||"تعذر استيراد الملف.","error");}finally{input.value="";}
  }

  function renderTrash() {
    const list=$("#trashList");if(!list)return;
    if(!deletedSubscriptions.length){list.innerHTML=`<div class="empty-state"><i class="fa-regular fa-trash-can"></i><h3>سلة المحذوفات فارغة</h3><p>الاشتراكات المحذوفة ستظهر هنا.</p></div>`;return;}
    list.innerHTML=deletedSubscriptions.map(sub=>`<div class="trash-item">${serviceCell(sub)}<div class="button-row"><button class="btn btn-soft btn-small" data-trash-action="restore" data-id="${sub.id}"><i class="fa-solid fa-rotate-left"></i> استعادة</button><button class="btn btn-danger-outline btn-small" data-trash-action="delete-forever" data-id="${sub.id}"><i class="fa-solid fa-trash"></i> حذف نهائي</button></div></div>`).join("");
  }

  function handleTrashAction(event) {
    const button=event.target.closest("[data-trash-action]");if(!button)return;const index=deletedSubscriptions.findIndex(sub=>sub.id===button.dataset.id);if(index<0)return;
    if(button.dataset.trashAction==="restore"){const [restored]=deletedSubscriptions.splice(index,1);delete restored.deletedAt;subscriptions.unshift(restored);showToast("تمت استعادة الاشتراك.","success");}
    else if(window.confirm("سيتم حذف الاشتراك نهائيًا ولا يمكن استعادته. هل تريد المتابعة؟")){deletedSubscriptions.splice(index,1);showToast("تم الحذف النهائي.","success");}else return;
    saveState();renderAll();
  }

  function emptyTrash(){if(!deletedSubscriptions.length)return showToast("سلة المحذوفات فارغة.","warning");if(!window.confirm("سيتم حذف جميع العناصر نهائيًا. هل تريد المتابعة؟"))return;deletedSubscriptions=[];saveState();renderTrash();showToast("تم إفراغ سلة المحذوفات.","success");}
  function printCurrentView(){document.body.classList.toggle("hide-sensitive-print",settings.hideSensitivePrint);window.print();}
  function openModal(id){$("#"+id).classList.remove("hidden");document.body.classList.add("modal-open");}
  function closeModal(id){const modal=$("#"+id);if(modal)modal.classList.add("hidden");if(!$$('.modal-backdrop:not(.hidden)').length)document.body.classList.remove("modal-open");}
  function togglePasswordVisibility(input,button){const visible=input.type==="text";input.type=visible?"password":"text";button.querySelector("i").className=visible?"fa-regular fa-eye":"fa-regular fa-eye-slash";}
  function formatCurrency(value,currency){try{return new Intl.NumberFormat("ar-EG",{style:"currency",currency:currency||"EGP",maximumFractionDigits:2}).format(Number(value||0));}catch{return `${value||0} ${currency||""}`;}}
  function formatDate(value){if(!value)return"—";return new Intl.DateTimeFormat("ar-EG",{year:"numeric",month:"2-digit",day:"2-digit"}).format(parseDate(value));}
  function formatDateTime(value){if(!value)return"—";return new Intl.DateTimeFormat("ar-EG",{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"}).format(new Date(value));}
  function parseDate(value){const [year,month,day]=String(value).split("-").map(Number);return new Date(year,month-1,day,12,0,0,0);}
  function parseDateEnd(value){const [year,month,day]=String(value).split("-").map(Number);return new Date(year,month-1,day,23,59,59,999);}
  function startOfDay(date){return new Date(date.getFullYear(),date.getMonth(),date.getDate());}
  function sameDay(a,b){return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();}
  function toInputDate(date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;}
  function toArabicDigits(value){return String(value).replace(/\d/g,digit=>"٠١٢٣٤٥٦٧٨٩"[digit]);}
  function createId(){return crypto.randomUUID?.()||`sub-${Date.now()}-${Math.random().toString(16).slice(2)}`;}
  function escapeHTML(value){return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]));}
  function escapeAttribute(value){return escapeHTML(value).replace(/`/g,"&#096;");}
  function downloadFile(filename,content,type){const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),anchor=document.createElement("a");anchor.href=url;anchor.download=filename;document.body.appendChild(anchor);anchor.click();anchor.remove();URL.revokeObjectURL(url);}
  function showToast(message,type="success"){const toast=document.createElement("div");toast.className=`toast ${type}`;const icon=type==="success"?"fa-circle-check":type==="error"?"fa-circle-xmark":"fa-triangle-exclamation";toast.innerHTML=`<i class="fa-solid ${icon}"></i><span>${escapeHTML(message)}</span>`;$("#toastContainer").appendChild(toast);setTimeout(()=>{toast.style.opacity="0";toast.style.transform="translateY(12px)";setTimeout(()=>toast.remove(),220);},3800);}

  // نقطة توسعة مستقبلية: استبدل فتح wa.me باستدعاء Backend آمن يربط WhatsApp Business Cloud API.
  // لا تضع Access Token أو مفاتيح API داخل JavaScript في الواجهة الأمامية.
})();
