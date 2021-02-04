// When a video stream is added to the conference
VoxeetSDK.conference.on('streamAdded', (participant, stream) => {
    logMessage(`Event - streamAdded from ${participant.info.name} (${participant.id})`);

    if (stream.type === 'ScreenShare') {
        return addScreenShareNode(participant, stream);
    }

    if (stream.getVideoTracks().length) {
        // Only add the video node if there is a video track
        addVideoNode(participant, stream);
    }
    
    addParticipantNode(participant);
});

// When a video stream is updated from the conference´
VoxeetSDK.conference.on('streamUpdated', (participant, stream) => {
    logMessage(`Event - streamUpdated from ${participant.info.name} (${participant.id})`);

    if (stream.type === 'ScreenShare') return;

    if (stream.getVideoTracks().length) {
        // Only add the video node if there is a video track
        addVideoNode(participant, stream);
        updateVideoMessage(participant, stream);
    } else {
        removeVideoNode(participant);
    }
});

// When a video stream is removed from the conference
VoxeetSDK.conference.on('streamRemoved', (participant, stream) => {
    logMessage(`Event - streamRemoved from ${participant.info.name} (${participant.id})`);

    if (stream.type === 'ScreenShare') {
        return removeScreenShareNode();
    }

    removeVideoNode(participant);
    removeParticipantNode(participant);
});



VoxeetSDK.videoPresentation.on('started', (vp) => {
    logMessage(`Event - videoPresentation started ${vp.url}`);

    addVideoPlayer(vp.url);
    $(`#stream-video video`)[0].currentTime = vp.timestamp;
});

VoxeetSDK.videoPresentation.on('paused', (vp) => {
    logMessage(`Event - videoPresentation paused at ${vp.timestamp}ms`);

    $(`#stream-video video`)[0].pause();
    $(`#stream-video video`)[0].currentTime = vp.timestamp / 1000;
});

VoxeetSDK.videoPresentation.on('played', (vp) => {
    logMessage('Event - videoPresentation played');

    $(`#stream-video video`)[0].play();
});

VoxeetSDK.videoPresentation.on('sought', (vp) => {
    logMessage(`Event - videoPresentation sought to ${vp.timestamp}ms`);
    $(`#stream-video video`)[0].currentTime = vp.timestamp / 1000;
});

VoxeetSDK.videoPresentation.on('stopped', () => {
    logMessage('Event - videoPresentation stopped');

    $(`#stream-video`).remove();
});



// When other participants send a command
VoxeetSDK.command.on('received', (participant, messsage) => {
    logMessage(`Event - command received from ${participant.info.name}: ${messsage}`);
});
