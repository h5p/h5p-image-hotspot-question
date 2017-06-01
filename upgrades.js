var H5PUpgrades = H5PUpgrades || {};

H5PUpgrades['H5P.ImageHotspotQuestion'] = (function ($) {
  return {
    1: {
      7: {
        contentUpgrade: function (parameters, finished) {
          if (parameters.hotspotSettings === undefined) {
            parameters.hotspotSettings = {};
          }

          if (parameters.hotspotSettings.l10n === undefined) {
            parameters.hotspotSettings.l10n = {
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
