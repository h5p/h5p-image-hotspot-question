var H5PUpgrades = H5PUpgrades || {};

H5PUpgrades['H5P.ImageHotspotQuestion'] = (function ($) {
  return {
    1: {
      6: {
        contentUpgrade: function (parameters, finished) {
          if (parameters.imageHotspotQuestion.hotspotSettings.l10n === undefined) {
            parameters.imageHotspotQuestion.hotspotSettings.l10n = {
              retryText: 'Retry',
              closeText: 'Close'
            };
          }
          finished(null, parameters);
        }
      }
    }
  };
})(H5P.jQuery);
