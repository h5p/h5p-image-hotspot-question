var H5PPresave = H5PPresave || {};

H5PPresave['H5P.ImageHotspotQuestion'] = function(content, finished) {
  if (finished) {
    finished({maxScore: 1});
  }
};
