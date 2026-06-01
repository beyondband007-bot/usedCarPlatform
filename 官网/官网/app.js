const caseData = {
  used: {
    title: "出海提效",
    image: "./图片/ChatGPT Image 2026年5月28日 11_45_07 (4).png",
    pain: "图片处理过程繁琐，本地化素材处理缓慢",
    service: "适配各种车型的多角度外观图、内饰图、LOGO车牌处理",
  },
  showroom: {
    title: "内容提效",
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
