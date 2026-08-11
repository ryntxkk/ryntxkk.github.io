window.addEventListener('load', function () {
    var body = document.body;
    var intro = document.getElementById('intro');
    var landing = document.getElementById('landing');
    var landingContent = document.getElementById('landing-content');
    var typing = document.getElementById('typing');
    var logoLetters = Array.prototype.slice.call(document.querySelectorAll('#logo span'));
    var subtitle = document.querySelector('.subtitle');
    var enterBtn = document.getElementById('enterBtn');
    var overlay = document.getElementById('transition-overlay');
    var storyFade = document.getElementById('story-fade');
    var narrationScreen = document.getElementById('narration-screen');
    var narrationLine1 = document.getElementById('narration-line-1');
    var narrationLine2 = document.getElementById('narration-line-2');
    var narrationLine3 = document.getElementById('narration-line-3');
    var narrationLine4 = document.getElementById('narration-line-4');
    var narrationLine5 = document.getElementById('narration-line-5');
    var narrationLine6 = document.getElementById('narration-line-6');
    var memorySection1 = document.getElementById('memory-1');
    var memorySection2 = document.getElementById('memory-2');
    var memorySection3 = document.getElementById('memory-3');
    var memorySection4 = document.getElementById('memory-4');
    var endingScreen = document.getElementById('ending-screen');
    var progressIndicator = document.getElementById('progress-indicator');
    var progressDots = Array.prototype.slice.call(document.querySelectorAll('.progress-dot'));
    var ambientParticles = document.getElementById('ambient-particles');
    var mouseLight = document.getElementById('mouse-light');
    var storySections = Array.prototype.slice.call(document.querySelectorAll('.story-section'));
    var text = 'Every heart\nhas a story\nit never tells.';
    var typingIndex = 0;
    var endingTimeout = null;
    var endingRevealTimers = [];
    var continueButtons = Array.prototype.slice.call(document.querySelectorAll('.continue-button'));
    var sceneButtons = {
        'narration-screen': document.getElementById('narration-continue'),
        'memory-1': document.getElementById('memory-1-continue'),
        'memory-2': document.getElementById('memory-2-continue'),
        'memory-3': document.getElementById('memory-3-continue'),
        'memory-4': document.getElementById('memory-4-continue')
    };
    var sceneElements = {
        'narration-screen': narrationScreen,
        'memory-1': memorySection1,
        'memory-2': memorySection2,
        'memory-3': memorySection3,
        'memory-4': memorySection4,
        'ending-screen': endingScreen
    };
    var isTransitioning = false;
    var currentSceneId = null;
    var pendingTimers = [];
    var NARRATION_CONTINUE_DELAY = 10800;
    var MEMORY_CONTINUE_DELAY = 1800;
    var ENDING_HOLD_DELAY = 25000;
    var OVERLAY_RELEASE_DELAY = 1500;
    var storyAudio = document.getElementById("story-audio");
    var audioToggle = document.getElementById("audio-toggle");
    var audioStarted = false;

    function startStoryAudio() {
        if (!storyAudio || audioStarted) return;

        audioStarted = true;
        storyAudio.volume = 0;

        var playPromise = storyAudio.play();

        if (playPromise !== undefined) {
            playPromise.catch(function () {
                audioStarted = false;
            });
        }

        var fade = setInterval(function () {
            if (!storyAudio) {
                clearInterval(fade);
                return;
            }

            if (storyAudio.volume < 0.14) {
                storyAudio.volume = Math.min(0.14, storyAudio.volume + 0.01);
            } else {
                clearInterval(fade);
            }
        }, 120);
    }
    if (audioToggle && storyAudio) {
        audioToggle.addEventListener("click", function() {
            if (storyAudio.muted) {
                storyAudio.muted = false;
                audioToggle.textContent = "🔊";
                audioToggle.setAttribute("aria-label", "Mute background audio");
            } else {
                storyAudio.muted = true;
                audioToggle.textContent = "🔇";
                audioToggle.setAttribute("aria-label", "Unmute background audio");
            }
        });
    }

    continueButtons.forEach(function (button) {
        button.disabled = true;
        button.classList.remove('is-visible', 'is-pressed');
    });

    function trackTimeout(callback, delay) {
        var timeoutId = setTimeout(callback, delay);
        pendingTimers.push(timeoutId);
        return timeoutId;
    }

    function clearPendingTimers() {
        pendingTimers.forEach(function (timeoutId) {
            clearTimeout(timeoutId);
        });
        pendingTimers = [];
    }

    function clearEndingRevealTimers() {
        endingRevealTimers.forEach(function (timeoutId) {
            clearTimeout(timeoutId);
        });
        endingRevealTimers = [];
    }

    function resetEndingScroll() {
        if (!endingScreen) {
            return;
        }

        endingScreen.scrollTop = 0;
        var endingInner = endingScreen.querySelector('.ending-inner');
        if (endingInner) {
            endingInner.scrollTop = 0;
        }
    }

    function getSceneElement(sceneId) {
        return sceneElements[sceneId] || null;
    }

    function getSceneButton(sceneId) {
        return sceneButtons[sceneId] || null;
    }

    function resetSceneScroll(scene) {
        if (!scene) {
            return;
        }

        if (typeof scene.scrollTop === 'number') {
            scene.scrollTop = 0;
        }

        var innerScroll = scene.querySelector('.narration-inner');
        if (innerScroll) {
            innerScroll.scrollTop = 0;
        }
    }

    function hideSceneButton(sceneId) {
        var button = getSceneButton(sceneId);
        if (!button) {
            return;
        }

        button.disabled = true;
        button.classList.remove('is-visible', 'is-pressed');
    }

    function revealSceneButton(sceneId, delay) {
        var button = getSceneButton(sceneId);
        if (!button) {
            return;
        }

        hideSceneButton(sceneId);
        trackTimeout(function () {
            button.disabled = false;
            button.classList.add('is-visible');
        }, delay);
    }

    function hideScene(sceneId) {
        var scene = getSceneElement(sceneId);
        if (!scene) {
            return;
        }

        scene.classList.remove('is-visible', 'is-leaving', 'is-fading');
        scene.classList.add('is-hidden');
        resetSceneScroll(scene);
        hideSceneButton(sceneId);
        if (sceneId === 'ending-screen') {
            clearEndingRevealTimers();
            resetEndingScroll();
        }
    }

    function showScene(sceneId) {
        var scene = getSceneElement(sceneId);
        if (!scene) {
            return;
        }

        scene.classList.remove('is-hidden', 'is-leaving', 'is-fading');
        scene.classList.add('is-visible');
        resetSceneScroll(scene);
        if (sceneId === 'ending-screen') {
            resetEndingScroll();
        }
        if (scene.focus) {
            scene.focus({ preventScroll: true });
        }
    }

    function scheduleEndingFade() {
        if (endingTimeout) {
            clearTimeout(endingTimeout);
        }

        endingTimeout = trackTimeout(function () {
            if (storyFade) {
                storyFade.classList.add('is-visible');
            }
        }, ENDING_HOLD_DELAY);
    }

    function revealEndingStory() {
        if (!endingScreen) {
            return;
        }

        var endingCredit = endingScreen.querySelector('.ending-credit');

        resetEndingScroll();
        clearEndingRevealTimers();

        var endingCopies = Array.prototype.slice.call(endingScreen.querySelectorAll('.ending-copy'));

        if (endingCredit) {
            endingRevealTimers.push(setTimeout(function () {
                endingCredit.classList.add('is-visible');
            }, 7000));
        }
        var endingGroups = [
            { items: endingCopies.slice(0, 4), startDelay: 0 },
            { items: endingCopies.slice(4, 11), startDelay: 1800 },
            { items: endingCopies.slice(11), startDelay: 4200 }
        ];

        endingGroups.forEach(function (group) {
            group.items.forEach(function (line, index) {
                endingRevealTimers.push(setTimeout(function () {
                    line.classList.add('is-visible');
                }, group.startDelay + (index * 220)));
            });
        });
    }

    function activateScene(sceneId) {
        currentSceneId = sceneId;
        showScene(sceneId);

        if (sceneId === 'ending-screen') {
            hideSceneButton(sceneId);
            if (storyFade) {
                storyFade.classList.remove('is-visible');
            }
            resetEndingScroll();
            revealEndingStory();
            scheduleEndingFade();
            return;
        }

        revealSceneButton(sceneId, MEMORY_CONTINUE_DELAY);
    }

    function startNarration() {
        if (!narrationScreen) {
            return;
        }

        clearPendingTimers();
        currentSceneId = 'narration-screen';
        resetNarration();
        showScene('narration-screen');

        var lines = [
            { el: narrationLine1, delay: NARRATION_LINE_1_DELAY },
            { el: narrationLine2, delay: NARRATION_LINE_2_DELAY },
            { el: narrationLine3, delay: NARRATION_LINE_3_DELAY },
            { el: narrationLine4, delay: NARRATION_LINE_4_DELAY },
            { el: narrationLine5, delay: NARRATION_LINE_5_DELAY },
            { el: narrationLine6, delay: NARRATION_LINE_6_DELAY }
        ];

        lines.forEach(function (item) {
            if (item.el) {
                trackTimeout(function () {
                    item.el.classList.add('is-visible');
                }, item.delay);
            }
        });

        revealSceneButton('narration-screen', NARRATION_CONTINUE_DELAY);
    }

    function transitionToScene(nextSceneId) {
        var leavingSceneId = currentSceneId;
        var leavingScene = getSceneElement(leavingSceneId);
        var leavingButton = getSceneButton(leavingSceneId);

        if (!nextSceneId || isTransitioning) {
            return;
        }

        isTransitioning = true;
        clearPendingTimers();

        if (leavingButton) {
            leavingButton.disabled = true;
            leavingButton.classList.add('is-pressed');
            leavingButton.classList.remove('is-visible');
        }

        if (leavingSceneId === 'narration-screen' && narrationScreen) {
            narrationScreen.classList.add('is-fading');
        } else if (leavingScene) {
            leavingScene.classList.add('is-leaving');
        }

        if (overlay) {
            overlay.classList.remove('is-releasing');
            overlay.classList.add('is-visible');
        }

        trackTimeout(function () {
            hideScene(leavingSceneId);
        }, FADE_TO_BLACK);

        trackTimeout(function () {
            hideScene(leavingSceneId);
            activateScene(nextSceneId);

            if (overlay) {
                overlay.classList.remove('is-visible');
                overlay.classList.add('is-releasing');
            }

            trackTimeout(function () {
                if (overlay) {
                    overlay.classList.remove('is-releasing');
                }
                isTransitioning = false;
            }, OVERLAY_RELEASE_DELAY);
        }, FADE_TO_BLACK + BLACK_PAUSE);
    }

    continueButtons.forEach(function (button) {
        button.addEventListener('click', function () {
            if (button.disabled || isTransitioning) {
                return;
            }

            var nextSceneId = button.getAttribute('data-next');
            if (!nextSceneId) {
                return;
            }

            button.disabled = true;
            button.classList.add('is-pressed');
            transitionToScene(nextSceneId);
        });
    });

    function typeText() {
        if (!typing) {
            return;
        }

        if (typingIndex < text.length) {
            typing.innerHTML = text.substring(0, typingIndex + 1) + '<span class="cursor">|</span>';
            typingIndex += 1;
            var speed = text.charAt(typingIndex) === ' ' ? 40 : 60;
            setTimeout(typeText, speed);
            return;
        }

        typing.innerHTML = text;
        setTimeout(showLanding, 1800);
    }

    function showLanding() {
        if (!intro || !landing) {
            return;
        }

        intro.classList.remove('is-visible');
        intro.classList.add('is-hidden');

        setTimeout(function () {
            landing.classList.remove('is-hidden');
            landing.classList.add('is-visible');
            animateLanding();
        }, 1000);
    }

    function animateLanding() {
        logoLetters.forEach(function (letter, index) {
            setTimeout(function () {
                letter.classList.add('is-visible');
            }, index * 90);
        });

        if (subtitle) {
            setTimeout(function () {
                subtitle.classList.add('is-visible');
            }, 1100);
        }

        if (enterBtn) {
            setTimeout(function () {
                enterBtn.classList.add('is-visible');
            }, 1500);
        }

        setTimeout(function () {
            document.getElementById('logo').classList.add('is-breathing');
        }, 1700);
    }

    var FADE_TO_BLACK = 1000;
    var BLACK_PAUSE = 1400;
    var NARRATION_LINE_1_DELAY = 600;
    var NARRATION_LINE_2_DELAY = 2200;
    var NARRATION_LINE_3_DELAY = 4000;
    var NARRATION_LINE_4_DELAY = 6200;
    var NARRATION_LINE_5_DELAY = 7200;
    var NARRATION_LINE_6_DELAY = 8400;

    function resetNarration() {
        if (!narrationScreen) {
            return;
        }
        narrationScreen.classList.remove('is-visible', 'is-fading');
        narrationScreen.classList.add('is-hidden');
        hideSceneButton('narration-screen');
        [narrationLine1, narrationLine2, narrationLine3, narrationLine4, narrationLine5, narrationLine6].forEach(function (line) {
            if (line) {
                line.classList.remove('is-visible');
            }
        });
    }

    function startStory() {
        if (!enterBtn || !landingContent || !overlay || !landing) {
            return;
        }
        startStoryAudio();
        enterBtn.disabled = true;
        enterBtn.classList.add('is-pressed');
        landingContent.classList.add('is-leaving');
        overlay.classList.remove('is-releasing');
        overlay.classList.add('is-visible');

        setTimeout(function () {
            landing.classList.remove('is-visible');
            landing.classList.add('is-hidden');

            setTimeout(startNarration, BLACK_PAUSE);
        }, FADE_TO_BLACK);
    }

    if (mouseLight) {
        document.addEventListener('mousemove', function (e) {
            mouseLight.style.left = e.clientX + 'px';
            mouseLight.style.top = e.clientY + 'px';
        });
    }

    if (ambientParticles) {
        var particleClasses = ['particle--a', 'particle--b', 'particle--c', 'particle--d', 'particle--e', 'particle--f', 'particle--g'];
        for (var p = 0; p < 10; p += 1) {
            var particle = document.createElement('span');
            particle.className = 'particle ' + particleClasses[p % particleClasses.length];
            ambientParticles.appendChild(particle);
        }
    }

    if (enterBtn) {
        enterBtn.addEventListener('click', startStory);
    }
    setTimeout(typeText, 1200);
});
