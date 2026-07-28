(function(){
  var carousels = document.querySelectorAll('[data-carousel]');
  if(!carousels.length) return;

  carousels.forEach(function(root){
    var slides = root.querySelectorAll('.ic-slide');
    var dots = root.querySelectorAll('.ic-dot');
    if(slides.length < 2) return;

    var interval = parseInt(root.getAttribute('data-interval'), 10) || 5000;
    var index = 0;
    var timer = null;
    var paused = false;

    function show(next){
      slides[index].classList.remove('is-active');
      dots[index] && dots[index].classList.remove('is-active');
      index = (next + slides.length) % slides.length;
      slides[index].classList.add('is-active');
      dots[index] && dots[index].classList.add('is-active');
    }

    function tick(){
      if(paused) return;
      show(index + 1);
    }

    function start(){
      stop();
      timer = window.setInterval(tick, interval);
    }
    function stop(){
      if(timer){ window.clearInterval(timer); timer = null; }
    }

    dots.forEach(function(dot, i){
      dot.addEventListener('click', function(){
        show(i);
        start();
      });
    });

    root.addEventListener('mouseenter', function(){ paused = true; });
    root.addEventListener('mouseleave', function(){ paused = false; });
    root.addEventListener('focusin', function(){ paused = true; });
    root.addEventListener('focusout', function(){ paused = false; });

    // Touch swipe — pause during the gesture, resume after, advance/
    // retreat a single slide per swipe rather than tracking velocity.
    var touchStartX = null;
    root.addEventListener('touchstart', function(e){
      paused = true;
      touchStartX = e.touches[0].clientX;
    }, { passive: true });
    root.addEventListener('touchend', function(e){
      if(touchStartX === null) return;
      var dx = e.changedTouches[0].clientX - touchStartX;
      if(Math.abs(dx) > 40){
        show(index + (dx < 0 ? 1 : -1));
      }
      touchStartX = null;
      paused = false;
    }, { passive: true });

    if(!window.matchMedia || !window.matchMedia('(prefers-reduced-motion: reduce)').matches){
      start();
    }
  });
})();
