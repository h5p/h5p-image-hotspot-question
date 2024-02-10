H5P.ImageHotspotQuestion = (function ($, Question) {

  /**
   * Initialize module.
   * @class H5P.ImageHotspotQuestion
   * @extends H5P.Question
   * @param {object} params Behavior settings
   * @param {number} id Content identification
   * @param {object} contentData Task specific content data
   */
  function ImageHotspotQuestion(params, id, contentData) {
    const defaults = {
      imageHotspotQuestion: {
        backgroundImageSettings: {
          backgroundImage: {
            path: ''
          }
        },
        hotspotSettings: {
          hotspot: [],
          showFeedbackAsPopup: true,
          l10n: {
            retryText: 'Retry',
            closeText: 'Close'
          }
        }
      },
      behaviour: {
        enableRetry: true
      },
      scoreBarLabel: 'You got :num out of :total points',
      a11yRetry:
        'Retry the task. Reset all responses and start the task over again.',
    };

    // Inheritance
    Question.call(this, 'image-hotspot-question');

    /**
     * Keeps track of content id.
     * @type {number}
     */
    this.contentId = id;

    /**
     * Keeps track of current score.
     * @type {number}
     */
    this.score = 0;

    /**
     * Keeps track of max score.
     * @type {number}
     */
    this.maxScore = 1;

    /**
     * Keeps track of parameters.
     */
    this.params = $.extend(true, {}, defaults, params);

    /**
     * Easier access to image settings.
     * H5P semantics doesn't treat Arrays with one element as arrays with one element
     */
    this.imageSettings =
      this.params.imageHotspotQuestion.backgroundImageSettings;

    /**
     * Easier access to hotspot settings.
     */
    this.hotspotSettings = this.params.imageHotspotQuestion.hotspotSettings;

    /**
     * Hotspot feedback object. Contains hotspot feedback specific parameters.
     * @type {object}
     */
    this.hotspotFeedback = {
      hotspotChosen: false
    };

    /**
     * Keeps track of all hotspots in an array.
     * @type {HTMLElement[]}
     */
    this.hotspots = [];

    /**
     * Keeps track of the content data. Specifically the previous state.
     * @type {object}
     */
    this.contentData = contentData;
    this.previousState = contentData?.previousState;

    this.dom = this.createContent();

    // Start activity timer
    if (this.isRoot()) {
      this.setActivityStarted();
    }

    // Register resize listener with h5p
    this.on('resize', () => {
      this.resize();
    });
  }

  // Inheritance
  ImageHotspotQuestion.prototype = Object.create(Question.prototype);
  ImageHotspotQuestion.prototype.constructor = ImageHotspotQuestion;

  /**
   * Registers this question types DOM elements before they are attached.
   * Called from H5P.Question.
   */
  ImageHotspotQuestion.prototype.registerDomElements = function () {
    // Register task introduction text
    if (this.hotspotSettings.taskDescription) {
      this.setIntroduction(this.hotspotSettings.taskDescription);
    }

    // Register task content area
    this.setContent(H5P.jQuery(this.dom));

    // Register retry button
    this.createRetryButton();
  };

  /**
   * Create main dom.
   * @returns {HTMLElement} Main dom element.
   */
  ImageHotspotQuestion.prototype.createContent = function () {
    const dom = document.createElement('div');
    dom.classList.add('h5p-image-hotspot-question');

    if (this.imageSettings?.path) {
      this.imageWrapper = document.createElement('div');
      this.imageWrapper.classList.add('image-wrapper');
      this.imageWrapper.addEventListener('click', (mouseEvent) => {
        const position =
          this.getFeedbackPosition(this.imageWrapper, mouseEvent);
        this.createHotspotFeedback(position);
      });
      dom.append(this.imageWrapper);

      // Image loader screen
      const loader = document.createElement('div');
      loader.classList.add('image-loader', 'loading');
      this.imageWrapper.append(loader);

      this.backgroundImage = new Image();
      this.backgroundImage.classList.add('hotspot-image');
      this.backgroundImage.addEventListener('load', () => {
        loader.parentNode.replaceChild(this.backgroundImage, loader);
        this.trigger('resize');
      });
      this.backgroundImage.src =
        H5P.getPath(this.imageSettings.path, this.contentId);

      this.attachHotspots();
    }
    else {
      const message = document.createElement('div');
      message.innerText = 'No background image was added!';
      dom.append(message);
    }

    return dom;
  };

  /**
   * Attach all hotspots.
   */
  ImageHotspotQuestion.prototype.attachHotspots = function () {
    this.hotspotSettings.hotspot.forEach((params) => {
      this.attachHotspot(params);
    });
  };

  /**
   * Attach single hotspot.
   * @param {object} params Hotspot parameters.
   */
  ImageHotspotQuestion.prototype.attachHotspot = function (params) {
    const hotspot = document.createElement('div');
    hotspot.classList.add('image-hotspot', params.computedSettings.figure);
    hotspot.style.left = `${params.computedSettings.x}%`;
    hotspot.style.top = `${params.computedSettings.y}%`;
    hotspot.style.width = `${params.computedSettings.width}%`;
    hotspot.style.height = `${params.computedSettings.height}%`;
    hotspot.addEventListener('click', (mouseEvent) => {
      // Create new hotspot feedback
      const position = this.getFeedbackPosition(hotspot, mouseEvent);
      this.createHotspotFeedback(position, params);

      // Do not propagate
      return false;
    });
    this.imageWrapper.append(hotspot);

    this.hotspots.push(hotspot);
  };

  /**
   * Get feedback position based on mouse event and clicked element.
   * @param {HTMLElement} clickedElement Element clicked on.
   * @param {MouseEvent} mouseEvent Mouse event.
   * @returns
   */
  ImageHotspotQuestion.prototype.getFeedbackPosition = function (
    clickedElement, mouseEvent
  ) {
    let x = mouseEvent.offsetX;
    let y = mouseEvent.offsetY;

    // Apply clicked element offset if click was not in wrapper
    if (!clickedElement.classList.contains('image-wrapper')) {
      x += clickedElement.offsetLeft;
      y += clickedElement.offsetTop;
    }

    x = x / (this.imageWrapper.offsetWidth / 100);
    y = y / (this.imageWrapper.offsetHeight / 100);

    return { x: x, y: y };
  };

  /**
   * Create a feedback element for a click.
   * @param {object} position Position of the click.
   * @param {number} position.x X position of the click.
   * @param {number} position.y Y position of the click.
   * @param {object} params Hotspot parameters.
   */
  ImageHotspotQuestion.prototype.createHotspotFeedback = function (
    position, params
  ) {
    // Do not create new hotspot if one exists
    if (this.hotspotFeedback.hotspotChosen) {
      return;
    }

    this.hotspotFeedback.element = document.createElement('div');
    this.hotspotFeedback.element.classList.add('hotspot-feedback');
    this.imageWrapper.append(this.hotspotFeedback.element);

    this.hotspotFeedback.hotspotChosen = true;

    // Keep position and pixel offsets for resizing
    this.hotspotFeedback.percentagePosX = position.x;
    this.hotspotFeedback.percentagePosY = position.y;
    this.hotspotFeedback.pixelOffsetX =
      this.hotspotFeedback.element.offsetWidth / 2;
    this.hotspotFeedback.pixelOffsetY =
      this.hotspotFeedback.element.offsetHeight / 2;

    // Position feedback
    this.resizeHotspotFeedback();

    // Style correct answers
    if (params?.userSettings.correct) {
      this.hotspotFeedback.element.classList.add('correct');
      this.finishQuestion();
    }
    else if (this.params.behaviour.enableRetry) {
      // Wrong answer, show retry button
      this.showButton('retry-button');
    }

    const feedbackText = params?.userSettings.feedbackText ||
      this.params.imageHotspotQuestion.hotspotSettings.noneSelectedFeedback ||
      '&nbsp;';

    // Send these settings into setFeedback to turn feedback into a popup.
    const popupSettings = {
      showAsPopup:
        this.params.imageHotspotQuestion.hotspotSettings.showFeedbackAsPopup,
      closeText:
        this.params.imageHotspotQuestion.hotspotSettings.l10n.closeText,
      click:
        {...this.hotspotFeedback, $element: $(this.hotspotFeedback.element)}
    };

    this.setFeedback(
      feedbackText,
      this.score,
      this.maxScore,
      this.params.scoreBarLabel,
      undefined,
      popupSettings
    );

    // Finally add fade in animation to hotspot feedback
    this.hotspotFeedback.element.classList.add('fade-in');

    // Trigger xAPI completed event
    this.triggerAnswered();
  };

  /**
   * Create retry button and add it to button bar.
   */
  ImageHotspotQuestion.prototype.createRetryButton = function () {
    this.addButton(
      'retry-button',
      this.params.imageHotspotQuestion.hotspotSettings.l10n.retryText,
      () => {
        this.resetTask();
      },
      false,
      { 'aria-label': this.params.a11yRetry }
    );
  };

  /**
   * Finish question and remove retry button.
   */
  ImageHotspotQuestion.prototype.finishQuestion = function () {
    this.score = 1;
    // Remove button
    this.hideButton('retry-button');
  };

  /**
   * Determine whether the task was answered already.
   * @returns {boolean} True if answer was given by user, else false.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-1}
   */
  ImageHotspotQuestion.prototype.getAnswerGiven = function () {
    return this.hotspotFeedback.hotspotChosen;
  };

  /**
   * Get current score.
   * @returns {number} Current score.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-2}
   */
  ImageHotspotQuestion.prototype.getScore = function () {
    return this.score;
  };

  /**
   * Get maximum possible score.
   * @returns {number} Maximum possible score.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-3}
   */
  ImageHotspotQuestion.prototype.getMaxScore = function () {
    return this.maxScore;
  };

  /**
   * Show solutions.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-4}
   */
  ImageHotspotQuestion.prototype.showSolutions = function () {
    let foundSolution = false;

    this.hotspotSettings.hotspot.forEach((hotspot, index) => {
      if (hotspot.userSettings.correct && !foundSolution) {
        const correctHotspot = this.hotspots[index];
        const position = this.getFeedbackPosition(
          correctHotspot,
          {
            offsetX: (correctHotspot.offsetWidth / 2),
            offsetY: (correctHotspot.offsetHeight / 2)
          }
        );
        this.createHotspotFeedback(position, hotspot);
        foundSolution = true;
      }
    });
  };

  /**
   * Reset task.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-5}
   */
  ImageHotspotQuestion.prototype.resetTask = function () {
    // Remove hotspot feedback
    this.hotspotFeedback.element?.remove();
    this.hotspotFeedback.hotspotChosen = false;

    // Hide retry button
    this.hideButton('retry-button');

    // Clear feedback
    this.removeFeedback();
  };

  /**
   * Get xAPI data.
   * @returns {object} XAPI statement.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-6}
   */
  ImageHotspotQuestion.prototype.getXAPIData = function () {
    const xAPIEvent = this.createXAPIEventTemplate('answered');
    xAPIEvent.setScoredResult(
      this.getScore(), this.getMaxScore(), this, true, true
    );
    this.addQuestionToXAPI(xAPIEvent);

    return {
      statement: xAPIEvent.data.statement
    };
  };

  /**
   * Get title of content.
   * @returns {string} Title.
   */
  ImageHotspotQuestion.prototype.getTitle = function () {
    return H5P.createTitle(this.contentData?.metadata?.title ?? 'Fill In');
  };

  /**
   * Trigger xAPI answered event
   */
  ImageHotspotQuestion.prototype.triggerAnswered = function () {
    const xAPIEvent = this.createXAPIEventTemplate('answered');

    // Add score to xAPIEvent
    const score = this.getScore();
    const maxScore = this.getMaxScore();
    xAPIEvent.setScoredResult(score, maxScore, this, true, score === maxScore);

    this.addQuestionToXAPI(xAPIEvent);
    this.trigger(xAPIEvent);
  };

  /**
   * Add the question itself to the definition part of an xAPIEvent.
   */
  ImageHotspotQuestion.prototype.addQuestionToXAPI = function (xAPIEvent) {
    const definition =
      xAPIEvent.getVerifiedStatementValue(['object', 'definition']);
    $.extend(true, definition, this.getxAPIDefinition());
  };

  /**
   * Generate xAPI object definition used in xAPI statements.
   * @return {object|undefined} XAPI definition object or undefined if not supported.
   */
  ImageHotspotQuestion.prototype.getxAPIDefinition = function () {
    if (this.isRoot()) {
      return; // Individual report not supported
    }

    const definition = {};
    definition.description = {
      'en-US': this.getTitle()
    };
    definition.type = 'http://adlnet.gov/expapi/activities/cmi.interaction';
    definition.interactionType = 'other';
    return definition;
  };

  /**
   * Resize image and wrapper.
   */
  ImageHotspotQuestion.prototype.resize = function () {
    this.resizeImage();
    this.resizeHotspotFeedback();
  };

  /**
   * Resize image to fit parent width.
   */
  ImageHotspotQuestion.prototype.resizeImage = function () {
    // Check that question has been attached
    if (!this.dom || !this.backgroundImage) {
      return;
    }

    // Resize image to fit new container width.
    const parentWidth = this.dom.offsetWidth;
    this.backgroundImage.style.width = `${parentWidth}px`;

    // Find required height for new width.
    const naturalWidth = this.backgroundImage.naturalWidth;
    const naturalHeight = this.backgroundImage.naturalHeight;
    const imageRatio = naturalHeight / naturalWidth;
    let neededHeight = -1;
    if (parentWidth < naturalWidth) {
      // Scale image down
      neededHeight = parentWidth * imageRatio;
    }
    else {
      // Scale image to natural size
      this.backgroundImage.style.width = `${naturalWidth}px`;
      neededHeight = naturalHeight;
    }

    if (neededHeight !== -1) {
      this.backgroundImage.style.height = `${neededHeight}px`;

      // Resize wrapper to match image.
      this.dom.style.height = `${neededHeight}px`;
    }
  };

  /**
   * Re-position hotspot feedback.
   */
  ImageHotspotQuestion.prototype.resizeHotspotFeedback = function () {
    // Check that hotspot is chosen
    if (!this.hotspotFeedback.hotspotChosen) {
      return;
    }

    // Calculate positions
    const posX =
      this.hotspotFeedback.percentagePosX *
        this.imageWrapper.offsetWidth / 100 -
        this.hotspotFeedback.pixelOffsetX;
    const posY =
      this.hotspotFeedback.percentagePosY *
        this.imageWrapper.offsetHeight / 100 -
        this.hotspotFeedback.pixelOffsetY;

    this.hotspotFeedback.element.style.left = `${posX}px`;
    this.hotspotFeedback.element.style.top = `${posY}px`;
  };

  return ImageHotspotQuestion;
}(H5P.jQuery, H5P.Question));
