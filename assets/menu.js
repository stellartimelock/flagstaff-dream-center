(function () {
  var wrap = document.querySelector(".menu-wrap");
  if (!wrap) return;

  function closeMenu() {
    wrap.open = false;
  }

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") closeMenu();
  });

  document.addEventListener("click", function (event) {
    if (!wrap.contains(event.target)) closeMenu();
  });
})();
