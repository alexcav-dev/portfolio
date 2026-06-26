
  const sections = document.querySelectorAll('[id]');
  const navLinks = document.querySelectorAll('.nav-links a');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navLinks.forEach(a => a.classList.remove('active'));
        const active = document.querySelector(`.nav-links a[href="#${entry.target.id}"]`);
        if (active) active.classList.add('active');
      }
    });
  }, {threshold: 0.4});
  sections.forEach(s => observer.observe(s));

function downloadCV() {
  var a = document.createElement("a");
  a.href = "assets/files/Alex_Cavalcante_Costa_Curriculo_2026.pdf";
  a.download = "Alex_Cavalcante_Costa_-_Curriculo_2026.pdf";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
