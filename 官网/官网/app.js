const caseData = {
  used: {
    title: "手车出海提交",
    image: "./图片/ChatGPT Image 2026年5月28日 11_45_07 (4).png",
    pain: "出海 listing 需要多语言文案、统一场景图、人工修图周期长、成本高",
    service: "AI 场景影棚｜成片交付包｜外观图批量精修",
  },
  showroom: {
    title: "展厅批量拍摄",
    image: "./图片/ChatGPT Image 2026年5月28日 16_11_28.png",
    pain: "门店车辆周转快，传统拍摄排期慢，难以统一灯光、角度和画面质感",
    service: "展厅棚拍｜姿态矫正｜统一背景与质感增强",
  },
  new: {
    title: "新车标准套图",
    image: "./图片/ChatGPT Image 2026年5月28日 16_37_58.png",
    pain: "新车宣传需要覆盖官网、短视频封面、详情页和广告投放多种尺寸",
    service: "高清改尺寸｜天空影棚｜营销短视频封面",
  },
};

const tabs = document.querySelectorAll(".tab");
const caseImage = document.querySelector("#caseImage");
const caseTitle = document.querySelector("#caseTitle");
const casePain = document.querySelector("#casePain");
const caseService = document.querySelector("#caseService");

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const key = tab.dataset.case;
    const current = caseData[key];
    tabs.forEach((item) => item.classList.remove("active"));
    tab.classList.add("active");
    caseImage.src = current.image;
    caseImage.alt = `${current.title}案例成片`;
    caseTitle.textContent = current.title;
    casePain.textContent = current.pain;
    caseService.textContent = current.service;
  });
});

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.animate(
          [
            { opacity: 0, transform: "translateY(22px)" },
            { opacity: 1, transform: "translateY(0)" },
          ],
          {
            duration: 620,
            easing: "cubic-bezier(.16,1,.3,1)",
            fill: "both",
          },
        );
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 },
);

document
  .querySelectorAll(".suite-card, .feature-card, .case-layout, .final-cta")
  .forEach((item) => observer.observe(item));
