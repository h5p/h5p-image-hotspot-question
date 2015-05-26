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
    Question.call(self, 'ImageHotspotQuestion');

    // IDs
    this.contentId = id;

    // Set parameters.
    this.params = $.extend({}, defaults, params);
    this.imageSettings = this.params.imageHotspotQuestion.backgroundImageSettings.backgroundImage;
    this.hotspotSettings = this.params.imageHotspotQuestion.hotspotSettings;
    this.hotspotChosen = false;

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
  }

  // Inheritance
  ImageHotspotQuestion.prototype = Object.create(Question.prototype);
  ImageHotspotQuestion.prototype.constructor = ImageHotspotQuestion;

  ImageHotspotQuestion.prototype.createContent = function () {
    var $wrapper = $('<div>', {
      'class': 'image-hotspot-question'
    });

    this.$imageWrapper = $('<div>', {
      'class': 'image-wrapper'
    }).appendTo($wrapper);

    $('<img>', {
      'class': 'hotspot-image',
      'src': H5P.getPath(this.imageSettings.path, this.contentId)
    }).appendTo(this.$imageWrapper);

    this.attachHotspots();
    this.initImageClickListener();

    return $wrapper;
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
    // Remove old hotspot feedback
    if (this.hotspotChosen) {
      return;
    }

    var feedbackString = 'hotspot-feedback';
    if (hotspot && hotspot.correct) {
      feedbackString += ' correct';
    }

    this.$hotspotFeedback = $('<div>', {
      'class': feedbackString
    }).appendTo(this.$imageWrapper);

    // Center hotspot feedback on mouse click
    var feedbackWidth = this.$hotspotFeedback.width();
    var feedbackHeight = this.$hotspotFeedback.height();
    var feedbackPosX = mouseEvent.offsetX - (feedbackWidth / 2);
    var feedbackPosY = mouseEvent.offsetY - (feedbackHeight / 2);

    if ($clickedElement !== this.$imageWrapper) {
      feedbackPosX += $clickedElement.position().left;
      feedbackPosY += $clickedElement.position().top;
    }

    // Check edge cases
    if (feedbackPosX < 0) {
      feedbackPosX = 0;
    } else if (feedbackPosX + feedbackWidth > this.$imageWrapper.width()) {
      feedbackPosX = this.$imageWrapper.width() - feedbackWidth;
    }

    if (feedbackPosY < 0) {
      feedbackPosY = 0;
    } else if (feedbackPosY + feedbackHeight > this.$imageWrapper.height()) {
      feedbackPosY = this.$imageWrapper.height() - feedbackHeight;
    }

    this.$hotspotFeedback.css({
      left: feedbackPosX,
      top: feedbackPosY
    });
    this.hotspotChosen = true;

    // Style correct answers
    if (hotspot && hotspot.userSettings.correct) {
      this.$hotspotFeedback.addClass('correct');
      this.finishQuestion();
    } else {
      // Wrong answer, show retry button
      this.showButton('retry-button');
    }

    if (hotspot && hotspot.userSettings.feedbackText) {
      // Apply feedback text
      this.setFeedback(hotspot.userSettings.feedbackText);
    } else if ($clickedElement === this.$imageWrapper) {
      this.setFeedback(hotspot.noneSelectedFeedback);
    }


  };

  ImageHotspotQuestion.prototype.createRetryButton = function () {
    var self = this;

    self.addButton('retry-button', 'Retry', function () {
      // Remove hotspot feedback
      self.$hotspotFeedback.remove();
      self.hotspotChosen = false;

      // Hide retry button
      self.hideButton('retry-button');

      // Clear feedback
      self.setFeedback();
    });
  };

  /**
   * Question has been solved, remove retry button.
   */
  ImageHotspotQuestion.prototype.finishQuestion = function () {
    // Remove button
    this.hideButton('retry-button');
  };

  return ImageHotspotQuestion;
}(H5P.jQuery, H5P.Question));
