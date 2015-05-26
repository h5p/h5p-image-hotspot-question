var H5P = H5P || {};

H5P.ImageHotspotQuestion = (function ($, Question) {

  /**
   * Initialize module.
   *
   * @class H5P.ImageHotspotQuestion
   * @extends H5P.Task
   * @param {Object} params Behavior settings
   * @param {number} id Content identification
   * @param {Object} contentData Task specific content data
   */
  function ImageHotspotQuestion(params, id, contentData) {
    var self = this;

    var defaults = {
      imageHotspotQuestion: {
        backgroundImageSettings: {
          backgroundImage: {
            path: ''
          }
        },
        hotspotSettings: {
        }
      }
    };

    // Inheritance
    Question.call(self, 'image-hotspot-question');

    // IDs
    this.contentId = id;

    // Set parameters.
    this.params = $.extend({}, defaults, params);
    this.imageSettings = this.params.imageHotspotQuestion.backgroundImageSettings.backgroundImage;
    this.hotspotSettings = this.params.imageHotspotQuestion.hotspotSettings;
    this.hotspotFeedback = {
      hotspotChosen: false
    };

    // Previous state
    this.contentData = contentData;
    if (contentData !== undefined && contentData.previousState !== undefined) {
      this.previousState = contentData.previousState;
    }

    // Register task introduction text
    if (this.hotspotSettings.taskDescription) {
      this.setIntroduction(this.hotspotSettings.taskDescription);
    }

    // Register task content area
    var newContent = this.createContent();
    this.setContent(newContent);

    // Register buttons with button area
    this.createRetryButton();

    // Register resize listener with h5p
    H5P.on(this, 'resize', function () {
      self.resize();
    });
  }

  // Inheritance
  ImageHotspotQuestion.prototype = Object.create(Question.prototype);
  ImageHotspotQuestion.prototype.constructor = ImageHotspotQuestion;

  ImageHotspotQuestion.prototype.createContent = function () {
    var self = this;

    this.$wrapper = $('<div>', {
      'class': 'image-hotspot-question'
    });

    this.$imageWrapper = $('<div>', {
      'class': 'image-wrapper'
    }).appendTo(this.$wrapper);

    this.$img = $('<img>', {
      'class': 'hotspot-image',
      'src': H5P.getPath(this.imageSettings.path, this.contentId)
    }).appendTo(this.$imageWrapper);

    // Resize image once loaded
    this.$img.load(function () {
      self.trigger('resize');
    });

    this.attachHotspots();
    this.initImageClickListener();

    return this.$wrapper;
  };

  ImageHotspotQuestion.prototype.initImageClickListener = function () {
    var self = this;

    // Handle clicks that hit no hotspot
    if (this.hotspotSettings.noneSelectedFeedback) {
      this.$imageWrapper.click(function (mouseEvent) {
        // Create new hotspot feedback
        self.createHotspotFeedback($(this), mouseEvent);
      });
    }
  };

  ImageHotspotQuestion.prototype.attachHotspots = function () {
    var self = this;
    this.hotspotSettings.hotspot.forEach(function (hotspot) {
      self.attachHotspot(hotspot);
    });

  };

  ImageHotspotQuestion.prototype.attachHotspot = function (hotspot) {
    var self = this;
    $('<div>', {
      'class': 'image-hotspot ' + hotspot.computedSettings.figure
    }).css({
      left: hotspot.computedSettings.x + '%',
      top: hotspot.computedSettings.y + '%',
      width: hotspot.computedSettings.width + '%',
      height: hotspot.computedSettings.height + '%'
    }).click(function (mouseEvent) {

      // Create new hotspot feedback
      self.createHotspotFeedback($(this), mouseEvent, hotspot);

      // Do not propagate
      return false;


    }).appendTo(this.$imageWrapper);
  };

  ImageHotspotQuestion.prototype.createHotspotFeedback = function ($clickedElement, mouseEvent, hotspot) {
    // Do not create new hotspot if one exists
    if (this.hotspotFeedback.hotspotChosen) {
      return;
    }

    var feedbackString = 'hotspot-feedback';
    if (hotspot && hotspot.correct) {
      feedbackString += ' correct';
    }

    this.hotspotFeedback.$element = $('<div>', {
      'class': feedbackString
    }).appendTo(this.$imageWrapper);

    this.hotspotFeedback.hotspotChosen = true;

    // Center hotspot feedback on mouse click
    var feedbackPosX = mouseEvent.offsetX;
    var feedbackPosY = mouseEvent.offsetY;

    // Apply clicked element offset if click was not in wrapper
    if (!$clickedElement.hasClass('image-wrapper')) {
      feedbackPosX += $clickedElement.position().left;
      feedbackPosY += $clickedElement.position().top;
    }

    // Keep position and pixel offsets for resizing
    this.hotspotFeedback.percentagePosX = feedbackPosX / (this.$imageWrapper.width() / 100);
    this.hotspotFeedback.percentagePosY = feedbackPosY / (this.$imageWrapper.height() / 100);
    this.hotspotFeedback.pixelOffsetX = (this.hotspotFeedback.$element.width() / 2);
    this.hotspotFeedback.pixelOffsetY = (this.hotspotFeedback.$element.height() / 2);

    // Position feedback
    this.resizeHotspotFeedback();

    // Style correct answers
    if (hotspot && hotspot.userSettings.correct) {
      this.hotspotFeedback.$element.addClass('correct');
      this.finishQuestion();
    } else {
      // Wrong answer, show retry button
      this.showButton('retry-button');
    }

    if (hotspot && hotspot.userSettings.feedbackText) {
      // Apply feedback text
      this.setFeedback(hotspot.userSettings.feedbackText);
    } else if ($clickedElement.hasClass('image-wrapper')) {
      this.setFeedback(this.params.imageHotspotQuestion.hotspotSettings.noneSelectedFeedback);
    }


  };

  ImageHotspotQuestion.prototype.createRetryButton = function () {
    var self = this;

    this.addButton('retry-button', 'Retry', function () {
      // Remove hotspot feedback
      self.hotspotFeedback.$element.remove();
      self.hotspotFeedback.hotspotChosen = false;

      // Hide retry button
      self.hideButton('retry-button');

      // Clear feedback
      self.setFeedback();
    });

    // Hide retry button initially
    this.hideButton('retry-button');
  };

  /**
   * Question has been solved, remove retry button.
   */
  ImageHotspotQuestion.prototype.finishQuestion = function () {
    // Remove button
    this.hideButton('retry-button');
  };

  /**
   * Resize image and wrapper
   */
  ImageHotspotQuestion.prototype.resize = function () {
    this.resizeImage();
    this.resizeHotspotFeedback();
  };

  ImageHotspotQuestion.prototype.resizeImage = function () {
    var self = this;
    // Resize image to fit new container width.
    var parentWidth = this.$wrapper.width();
    this.$img.width(parentWidth);

    // Find required height for new width.
    var naturalWidth = this.$img.get(0).naturalWidth;
    var naturalHeight = this.$img.get(0).naturalHeight;
    var imageRatio = naturalHeight / naturalWidth;
    var neededHeight = -1;
    if (parentWidth < naturalWidth) {
      // Scale image down
      neededHeight = parentWidth * imageRatio;
    } else {
      // Scale image to natural size
      this.$img.width(naturalWidth);
      neededHeight = naturalHeight;
    }

    if (neededHeight !== -1) {
      this.$img.height(neededHeight);

      // Resize image wrapper to match image.
      self.$imageWrapper.height(neededHeight);
    }
  };

  /**
   * Re-position hotspot feedback.
   */
  ImageHotspotQuestion.prototype.resizeHotspotFeedback = function () {
    // Return hotspot is not chosen
    if (!this.hotspotFeedback.hotspotChosen) {
      return;
    }

    // Calculate positions
    var posX = (this.hotspotFeedback.percentagePosX * (this.$imageWrapper.width() / 100)) - this.hotspotFeedback.pixelOffsetX;
    var posY = (this.hotspotFeedback.percentagePosY * (this.$imageWrapper.height() / 100)) - this.hotspotFeedback.pixelOffsetY;

    // Apply new positions
    this.hotspotFeedback.$element.css({
      left: posX,
      top: posY
    });
  };

  return ImageHotspotQuestion;
}(H5P.jQuery, H5P.Question));
