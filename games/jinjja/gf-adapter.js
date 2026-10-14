(function () {
  'use strict';
  if (!window.GF) return;
  function sound(on) {
    if (window.SND && SND.isMuted() === on) SND.toggle();
  }
  GF.on('sound', function (event) { sound(event.on); });
  window.addEventListener('load', function () {
    if (GF.inFrame) {
      var style = document.createElement('style');
      // Every corner contains original controls or text. Reserve the frame band.
      style.textContent = '.app{top:76px!important} #muteBtn{display:none!important}';
      document.head.appendChild(style);
    }
    sound(GF.sound);
    GF.ready();
  });
})();
