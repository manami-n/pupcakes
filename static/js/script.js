// Toggle Nav

const domToggle = document.getElementById("nav-toggle");
const domUserIcon = document.getElementById("user-icon");
const navToggle = function () {
    domToggle.classList.toggle("active");
  };
domUserIcon.addEventListener('click', (e) => {
    e.stopPropagation();
    navToggle();
});
document.addEventListener('click', () => {
    if (domToggle.classList.contains("active")) {
        navToggle();
    }
});