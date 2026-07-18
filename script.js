/*
  Core Media Ad Website — GitHub / Cloudflare Pages Ready
  طريقة التعديل السريع:
  1) غيّر رقم الواتساب من SITE_CONFIG.whatsappNumber.
  2) غيّر بيانات جدول الباقات من packageRows.
  3) أضف الأعمال أو عدّلها من ملف projects.json فقط.
  4) ارفع الفيديوهات والصور إلى Cloudinary ثم ضع روابطها داخل projects.json.
*/

const SITE_CONFIG = {
  companyName: "Core Media Ad",
  phoneDisplay: "01125643485",
  phoneLink: "+201125643485",
  whatsappNumber: "201125643485",
  whatsappMessage: "مرحبًا Core Media Ad، أريد الاستفسار عن خدمات التسويق وإدارة السوشيال ميديا.",
  socialLinks: [
    { name: "Facebook", icon: "fa-brands fa-facebook-f", url: "#" },
    { name: "Instagram", icon: "fa-brands fa-instagram", url: "#" },
    { name: "TikTok", icon: "fa-brands fa-tiktok", url: "#" },
    { name: "YouTube", icon: "fa-brands fa-youtube", url: "#" },
    { name: "LinkedIn", icon: "fa-brands fa-linkedin-in", url: "#" },
    { name: "WhatsApp", icon: "fa-brands fa-whatsapp", url: "https://wa.me/201125643485" }
  ]
};

const services = [
  {
    icon: "📱",
    title: "إدارة السوشيال ميديا",
    desc: "إدارة صفحات فيسبوك، إنستجرام، تيك توك، ويوتيوب بشكل منظم يشمل النشر، المتابعة، وتحسين الظهور."
  },
  {
    icon: "🎯",
    title: "التسويق الإلكتروني",
    desc: "وضع خطط تسويقية مناسبة لطبيعة النشاط التجاري، وتحسين الوصول للعملاء المستهدفين."
  },
  {
    icon: "✍️",
    title: "كتابة المحتوى التسويقي",
    desc: "كتابة بوستات، أفكار حملات، سكريبتات فيديو، ونصوص إعلانية تساعد على جذب الجمهور."
  },
  {
    icon: "🎬",
    title: "خدمات المونتاج",
    desc: "مونتاج فيديوهات احترافية للسوشيال ميديا، الريلز، الإعلانات، وفيديوهات البراند."
  },
  {
    icon: "📊",
    title: "التقارير الأسبوعية والشهرية",
    desc: "تقديم تقارير منظمة توضح أداء المحتوى، التفاعل، النتائج، ونقاط التحسين."
  },
  {
    icon: "💡",
    title: "أفكار الحملات",
    desc: "ابتكار أفكار محتوى وحملات تناسب أهداف البراند والجمهور المستهدف."
  }
];

const packageColumns = [
  { key: "basic", title: "الباقة الأساسية", price: "2900 ج", note: "بداية منظمة", featured: false },
  { key: "medium", title: "الباقة المتوسطة", price: "3700 ج", note: "الأكثر طلبًا", featured: true },
  { key: "professional", title: "الباقة الاحترافية", price: "5100 ج", note: "حضور أقوى", featured: false }
];

const packageRows = [
  { service: "فيديوهات مونتاج", basic: "3 فيديوهات", medium: "4 فيديوهات", professional: "6 فيديوهات" },
  { service: "تصميم بوستات", basic: "4 بوستات", medium: "6 بوستات", professional: "8 بوستات" },
  { service: "كتابة محتوى تسويقي", basic: true, medium: true, professional: true },
  { service: "إدارة ومتابعة الصفحة", basic: true, medium: true, professional: true },
  { service: "تقرير شهري", basic: true, medium: true, professional: true },
  { service: "تقرير أسبوعي", basic: false, medium: true, professional: true },
  { service: "إدارة الحملات الإعلانية", basic: true, medium: true, professional: true }
];

const packageHighlights = [
  "خطة محتوى واضحة للشهر",
  "متابعة ونشر على الصفحة",
  "تقرير أداء يساعدك تعرف النتيجة"
];

let portfolioItems = [];

async function loadPortfolioItems() {
  try {
    const response = await fetch("projects.json", { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`تعذر تحميل projects.json: ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error("يجب أن يحتوي projects.json على قائمة مشاريع.");
    }

    portfolioItems = data;
  } catch (error) {
    console.error("تعذر تحميل معرض الأعمال:", error);
    portfolioItems = [];
  }
}

const features = [
  { icon: "🧠", title: "أفكار محتوى مناسبة", desc: "نبتكر أفكارًا تناسب كل نشاط وجمهوره المستهدف." },
  { icon: "✨", title: "تصميم ومونتاج احترافي", desc: "شكل بصري حديث يرفع جودة ظهور البراند." },
  { icon: "📈", title: "متابعة مستمرة للأداء", desc: "نراقب النتائج ونقترح تحسينات قابلة للتنفيذ." },
  { icon: "📋", title: "تقارير واضحة", desc: "تقارير أسبوعية وشهرية مفهومة ومنظمة." },
  { icon: "🗓️", title: "خطط تسويقية منظمة", desc: "تقويم محتوى وخطة نشر تساعد على الاستمرارية." },
  { icon: "🚀", title: "أسلوب عصري", desc: "تنفيذ مناسب لطبيعة السوشيال ميديا والترندات." }
];

const testimonials = [
  {
    quote: "نبدأ بفهم طبيعة النشاط والجمهور والهدف المطلوب قبل كتابة أي محتوى أو تصميم أي بوست.",
    name: "تحليل النشاط",
    role: "قبل التنفيذ"
  },
  {
    quote: "نجهز خطة شهرية واضحة تشمل الأفكار، التصميمات، الفيديوهات، ومواعيد النشر المناسبة.",
    name: "خطة المحتوى",
    role: "أثناء الشهر"
  },
  {
    quote: "نراجع الأرقام ونلخص النتائج في تقرير بسيط يساعدك تعرف الأداء وتقرر الخطوة اللي بعدها.",
    name: "تقرير الأداء",
    role: "نهاية الشهر"
  }
];

const qs = (selector, parent = document) => parent.querySelector(selector);
const qsa = (selector, parent = document) => [...parent.querySelectorAll(selector)];

function encodeWhatsApp(message = SITE_CONFIG.whatsappMessage) {
  return `https://wa.me/${SITE_CONFIG.whatsappNumber}?text=${encodeURIComponent(message)}`;
}

function renderServices() {
  const grid = qs("#servicesGrid");
  grid.innerHTML = services.map((service) => `
    <article class="service-card reveal">
      <div class="service-icon" aria-hidden="true">${service.icon}</div>
      <h3>${service.title}</h3>
      <p>${service.desc}</p>
    </article>
  `).join("");
}

function renderPackages() {
  const grid = qs("#packagesGrid");
  const renderCell = (value) => {
    if (typeof value === "boolean") {
      const label = value ? "متاح" : "غير متاح";
      const icon = value ? "✓" : "×";
      const state = value ? "included" : "excluded";

      return `<span class="feature-state ${state}" aria-label="${label}">${icon}</span>`;
    }

    return `<span class="package-value">${value}</span>`;
  };

  const renderFeatureText = (row, value) => {
    if (typeof value === "boolean") {
      return value ? row.service : `${row.service}: غير متاح`;
    }

    return `${row.service}: ${value}`;
  };

  const packageLink = (column) => encodeWhatsApp(`مرحبًا Core Media Ad، أريد تفاصيل ${column.title} بسعر ${column.price}.`);

  grid.innerHTML = `
    <div class="pricing-table-wrap reveal">
      <table class="pricing-table" aria-label="مقارنة الباقات">
        <thead>
          <tr>
            <th scope="col">الخدمة</th>
            ${packageColumns.map((column) => `
              <th scope="col">
                <span class="package-name">${column.title}</span>
                <span class="package-price">${column.price}</span>
                <span class="package-note ${column.featured ? "featured-note" : ""}">${column.note}</span>
              </th>
            `).join("")}
          </tr>
        </thead>
        <tbody>
          ${packageRows.map((row) => `
            <tr>
              <th scope="row">${row.service}</th>
              ${packageColumns.map((column) => `<td>${renderCell(row[column.key])}</td>`).join("")}
            </tr>
          `).join("")}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">ابدأ الآن</th>
            ${packageColumns.map((column) => `
              <td>
                <a class="btn btn-primary package-table-btn" href="${packageLink(column)}" target="_blank" rel="noopener">
                  اطلب الباقة
                </a>
              </td>
            `).join("")}
          </tr>
        </tfoot>
      </table>
    </div>
    <div class="pricing-cards reveal" aria-label="باقات Core Media Ad">
      ${packageColumns.map((column) => `
        <article class="package-card ${column.featured ? "featured" : ""}">
          ${column.featured ? `<span class="popular-badge">${column.note}</span>` : ""}
          <div class="package-card-top">
            <h3>${column.title}</h3>
            <strong>${column.price}</strong>
            <span>${column.featured ? "اختيار مناسب لمعظم الأنشطة" : column.note}</span>
          </div>
          <ul class="package-card-list">
            ${packageRows.map((row) => {
              const value = row[column.key];
              return `<li class="${value === false ? "unavailable" : ""}">${renderFeatureText(row, value)}</li>`;
            }).join("")}
          </ul>
          <div class="package-card-highlights">
            ${packageHighlights.map((item) => `<span>${item}</span>`).join("")}
          </div>
          <a class="btn btn-primary" href="${packageLink(column)}" target="_blank" rel="noopener">اطلب ${column.title}</a>
        </article>
      `).join("")}
    </div>
  `;
}

function createMedia(item) {
  const reelClass = item.ratio === "reel" ? "reel" : "image";
  const mediaBadge = item.ratio === "reel" ? "Reel 9:16" : item.category;

  if (item.media && item.mediaType === "video") {
    return `
      <div class="work-media ${reelClass}">
        <span class="work-type">${mediaBadge}</span>
        <video src="${item.media}" controls playsinline preload="metadata"></video>
      </div>`;
  }

  if (item.media && item.mediaType === "image") {
    return `
      <div class="work-media ${reelClass}">
        <span class="work-type">${mediaBadge}</span>
        <img src="${item.media}" alt="${item.title}" loading="lazy" />
      </div>`;
  }

  return `
    <div class="work-media ${reelClass}">
      <span class="work-type">${mediaBadge}</span>
      <div class="work-placeholder work-visual visual-${item.visual || "default"}">
        <span class="visual-stat">${item.stat || mediaBadge}</span>
        <div class="visual-screen" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <b>${item.title}</b>
      </div>
    </div>`;
}

function renderPortfolio(filter = "الكل") {
  const grid = qs("#portfolioGrid");
  const items = filter === "الكل" ? portfolioItems : portfolioItems.filter((item) => item.category === filter);

  if (!items.length) {
    grid.innerHTML = `
      <div class="portfolio-empty reveal visible">
        <h3>لا توجد أعمال في هذا القسم حاليًا</h3>
        <p>أضف مشروعًا جديدًا داخل ملف projects.json وسيظهر هنا تلقائيًا.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = items.map((item) => {
    const actionLink = item.link && item.link !== "#"
      ? item.link
      : encodeWhatsApp(`مرحبًا Core Media Ad، أريد تنفيذ عمل مشابه لـ ${item.title}.`);

    return `
      <article class="portfolio-card reveal" data-category="${item.category}">
        ${createMedia(item)}
        <div class="portfolio-body">
          <h3>${item.title}</h3>
          <p>${item.desc}</p>
          <a class="work-link" href="${actionLink}" target="_blank" rel="noopener">اطلب عمل مشابه</a>
        </div>
      </article>
    `;
  }).join("");

  observeRevealElements();
}

function renderPortfolioTabs() {
  const tabs = qs("#portfolioTabs");
  const categories = ["الكل", ...new Set(portfolioItems.map((item) => item.category))];

  tabs.innerHTML = categories.map((cat, index) => `
    <button class="filter-btn ${index === 0 ? "active" : ""}" type="button" data-filter="${cat}">${cat}</button>
  `).join("");

  tabs.addEventListener("click", (event) => {
    const button = event.target.closest(".filter-btn");
    if (!button) return;
    qsa(".filter-btn", tabs).forEach((btn) => btn.classList.remove("active"));
    button.classList.add("active");
    renderPortfolio(button.dataset.filter);
  });
}

function renderFeatures() {
  const grid = qs("#featuresGrid");
  grid.innerHTML = features.map((feature) => `
    <article class="feature-card reveal">
      <div class="feature-icon" aria-hidden="true">${feature.icon}</div>
      <h3>${feature.title}</h3>
      <p>${feature.desc}</p>
    </article>
  `).join("");
}

function renderTestimonials() {
  const grid = qs("#testimonialsGrid");
  grid.innerHTML = testimonials.map((item) => `
    <article class="testimonial-card reveal">
      <p>${item.quote}</p>
      <div class="client">
        <div class="client-avatar" aria-hidden="true">${item.name.slice(0, 1)}</div>
        <div>
          <h3>${item.name}</h3>
          <span>${item.role}</span>
        </div>
      </div>
    </article>
  `).join("");
}

function renderSocialLinks() {
  const socialHTML = SITE_CONFIG.socialLinks.map((link) => `
    <a href="${link.url}" target="_blank" rel="noopener" aria-label="${link.name}" title="${link.name}">
      <i class="${link.icon}" aria-hidden="true"></i>
    </a>
  `).join("");

  qs("#socialLinks").innerHTML = socialHTML;
  qs("#footerSocialLinks").innerHTML = socialHTML;
}

function setupContactLinks() {
  qsa(".whatsapp-link").forEach((link) => {
    link.href = encodeWhatsApp();
  });

  const phoneLink = qs("#phoneLink");
  phoneLink.href = `tel:${SITE_CONFIG.phoneLink}`;
  phoneLink.textContent = SITE_CONFIG.phoneDisplay;
}

function setupContactForm() {
  const form = qs("#contactForm");
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const message = `مرحبًا Core Media Ad،\nالاسم: ${data.get("name")}\nرقم الهاتف: ${data.get("phone")}\nالخدمة المطلوبة: ${data.get("service")}\nالرسالة: ${data.get("message") || "لا توجد تفاصيل إضافية"}`;
    window.open(encodeWhatsApp(message), "_blank", "noopener");
  });
}

function setupMobileMenu() {
  const menuToggle = qs("#menuToggle");
  const nav = qs("#primaryNav");

  menuToggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("open");
    menuToggle.classList.toggle("open", isOpen);
    menuToggle.setAttribute("aria-expanded", String(isOpen));
  });

  qsa("a", nav).forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("open");
      menuToggle.classList.remove("open");
      menuToggle.setAttribute("aria-expanded", "false");
    });
  });
}

function setupHeaderEffects() {
  const header = qs(".site-header");
  const navLinks = qsa(".main-nav a");
  const sections = navLinks.map((link) => qs(link.getAttribute("href"))).filter(Boolean);

  const updateHeader = () => {
    header.classList.toggle("scrolled", window.scrollY > 30);

    const current = sections.find((section) => {
      const rect = section.getBoundingClientRect();
      return rect.top <= 130 && rect.bottom >= 130;
    });

    navLinks.forEach((link) => {
      link.classList.toggle("active", current && link.getAttribute("href") === `#${current.id}`);
    });
  };

  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });
}

let revealObserver;
function observeRevealElements() {
  const elements = qsa(".reveal:not(.visible)");

  if (!("IntersectionObserver" in window)) {
    elements.forEach((element) => element.classList.add("visible"));
    return;
  }

  if (!revealObserver) {
    revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.14 });
  }

  elements.forEach((element) => revealObserver.observe(element));
}

async function init() {
  await loadPortfolioItems();
  renderServices();
  renderPackages();
  renderPortfolioTabs();
  renderPortfolio();
  renderFeatures();
  renderTestimonials();
  renderSocialLinks();
  setupContactLinks();
  setupContactForm();
  setupMobileMenu();
  setupHeaderEffects();
  observeRevealElements();
}

document.addEventListener("DOMContentLoaded", init);
