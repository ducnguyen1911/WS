(function (root) {
    'use strict';

    var DEFAULT_REVEAL_DELAY_MS = 60000;

    function pad(value) {
        return value < 10 ? '0' + value : String(value);
    }

    function formatElapsed(totalSeconds) {
        var seconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
        var hours = Math.floor(seconds / 3600);
        var minutes = Math.floor((seconds % 3600) / 60);
        var remainder = seconds % 60;
        return hours > 0
            ? pad(hours) + ':' + pad(minutes) + ':' + pad(remainder)
            : pad(minutes) + ':' + pad(remainder);
    }

    function create(onTick, revealDelayMs) {
        var delayMs = typeof revealDelayMs === 'number' && revealDelayMs >= 0
            ? revealDelayMs
            : DEFAULT_REVEAL_DELAY_MS;
        var startedAt = null;
        var revealHandle = null;
        var intervalHandle = null;

        function stop() {
            if (revealHandle !== null) root.clearTimeout(revealHandle);
            if (intervalHandle !== null) root.clearInterval(intervalHandle);
            revealHandle = null;
            intervalHandle = null;
            startedAt = null;
        }

        function render() {
            if (startedAt === null) return;
            var elapsedSeconds = Math.max(Math.ceil(delayMs / 1000), Math.floor((Date.now() - startedAt) / 1000));
            onTick(formatElapsed(elapsedSeconds), elapsedSeconds);
        }

        function start() {
            stop();
            startedAt = Date.now();
            revealHandle = root.setTimeout(function () {
                revealHandle = null;
                render();
                intervalHandle = root.setInterval(render, 1000);
            }, delayMs);
        }

        return { start: start, stop: stop };
    }

    root.HqdOperationTimer = {
        create: create,
        formatElapsed: formatElapsed
    };
}(window));
