document.querySelector(".menu")?.addEventListener("click", function (event) {
  var nav = document.querySelector("nav");
  nav.classList.toggle("open");
  event.currentTarget.setAttribute("aria-expanded", nav.classList.contains("open"));
});
