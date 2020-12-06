// Set the consumerKey and consumerSecret variables
// WARNING: It is best practice to use the VoxeetSDK.initializeToken function to initialize the SDK.
// Please read the documentation at:
// https://dolby.io/developers/interactivity-apis/client-sdk/initializing
const consumerKey = "CONSUMER_KEY";
const consumerSecret = "CONSUMER_SECRET";

function logMessage(message) {
    console.log(`${new Date().toISOString()} - ${message}`);
    $('#logs-area').val((_, text) => `${text}${new Date().toISOString()} - ${message}\r\n` );

    // Scroll to the end
    $('#logs-area').scrollTop($('#logs-area')[0].scrollHeight);
}

var conferenceId;

let webRtcConstraints = {
    audio: true,
    video: { width: 640, height: 480 }
};

$("#btn-set-webrtc-constraints").click(function() {
    let value = $('#webrtc-constraints').val();
    if (value === "0") {
        webRtcConstraints.video = { width: 640, height: 480 };
    } else if (value === "1") {
        webRtcConstraints.video = { width: 1280, height: 960 };
    } else if (value === "2") {
        webRtcConstraints.video = { width: 1920, height: 1080 };
    } else if (value === "3") {
        webRtcConstraints.video = { width: { ideal: 640 }, height: { ideal: 480 } };
    } else if (value === "4") {
        webRtcConstraints.video = { width: { ideal: 1280 }, height: { ideal: 960 } };
    } else if (value === "5") {
        webRtcConstraints.video = { width: { ideal: 1920 }, height: { ideal: 1080 } };
    } else if (value === "6") {
        webRtcConstraints.video = { width: { min: 640 }, height: { min: 480 } };
    } else if (value === "7") {
        webRtcConstraints.video = { width: { min: 1280 }, height: { min: 960 } };
    } else if (value === "8") {
        webRtcConstraints.video = { width: { min: 1920 }, height: { min: 1080 } };
    }

    logMessage(`Set Web RTC Constraints: ${JSON.stringify(webRtcConstraints)}`);
});

$("#connect-btn").click(function() {
    const username = $('#username-input').val();
  
    // Open a session to the Dolby APIs
    VoxeetSDK.session.open({ name: username })
      .then(() => {
        // Update the login message with the name of the user
        $('#title').text(`You are connected as ${username}`);
        $('#conference-join-btn').attr('disabled', false);
        $('#connect-btn').attr('disabled', true);
        $('#username-input').attr('readonly', true);
      })
      .then(() => logMessage(`You are connected as ${username}`))
      .catch((e) => logMessage(e));
});

$("#conference-join-btn").click(function() {
    const liveRecording = $('#chk-live-recording')[0].checked;

    // Default conference parameters
    // See: https://dolby.io/developers/interactivity-apis/client-sdk/reference-javascript/model/conferenceparameters
    let conferenceParams = {
        liveRecording: liveRecording,
        rtcpMode: "average", // worst, average, max
        ttl: 0,
        videoCodec: "H264", // H264, VP8
        dolbyVoice: true
    };

    // See: https://dolby.io/developers/interactivity-apis/client-sdk/reference-javascript/model/conferenceoptions
    let conferenceOptions = {
        alias: $('#conference-alias-input').val(),
        params: conferenceParams
    };

    // 1. Create a conference room with an alias
    VoxeetSDK.conference.create(conferenceOptions)
        .then((conference) => {
            logMessage(`Conference id: ${conference.id} & Conference alias ${conference.alias}`);
            conferenceId = conference.id;

            // See: https://dolby.io/developers/interactivity-apis/client-sdk/reference-javascript/model/joinoptions
            let joinOptions = {
                constraints: webRtcConstraints,
                simulcast: false
            };

            logMessage("Join the conference with the options:");
            logMessage(JSON.stringify(joinOptions));

            // 2. Join the conference
            VoxeetSDK.conference.join(conference, joinOptions)
                .then(() => {
                    // Load the Output Audio devices
                    VoxeetSDK.mediaDevice.enumerateAudioDevices("output")
                        .then(devices => {
                            console.log("Output Audio Devices");
                            console.log(devices);
                            $('#output-audio-devices').empty();

                            devices.forEach(device => {
                                $('#output-audio-devices').append(new Option(device.label, device.deviceId));
                            });

                            $('#btn-set-output-audio-device').attr('disabled', false);
                        })
                        .catch(err => logMessage(err));
                })
                .then(() => {
                    // Load the Input Audio devices
                    VoxeetSDK.mediaDevice.enumerateAudioDevices("input")
                        .then(devices => {
                            console.log("Input Audio Devices");
                            console.log(devices);
                            $('#input-audio-devices').empty();

                            devices.forEach(device => {
                                $('#input-audio-devices').append(new Option(device.label, device.deviceId));
                            });

                            $('#btn-set-input-audio-device').attr('disabled', false);
                        })
                        .catch(err => logMessage(err));
                })
                .then(() => {
                    // Load the Video devices
                    VoxeetSDK.mediaDevice.enumerateVideoDevices("input")
                        .then(devices => {
                            console.log("Video Devices");
                            console.log(devices);
                            $('#video-devices').empty();

                            devices.forEach(device => {
                                $('#video-devices').append(new Option(device.label, device.deviceId));
                            });

                            $('#btn-set-video-device').attr('disabled', false);
                        })
                        .catch(err => logMessage(err));
                })
                .then(() => {
                    $('#chk-live-recording').attr('disabled', true);
                    $('#conference-join-btn').attr('disabled', true);
                    $('#conference-leave-btn').attr('disabled', false);
                    $('#conference-alias-input').attr('readonly', true);

                    $('#start-video-btn').attr('disabled', true);
                    $('#stop-video-btn').attr('disabled', false);

                    $('#start-audio-btn').attr('disabled', true);
                    $('#stop-audio-btn').attr('disabled', false);
                    $('#mute-audio-btn').attr('disabled', false);
                    $('#unmute-audio-btn').attr('disabled', true);

                    $('#start-screenshare-btn').attr('disabled', false);
                    $('#stop-screenshare-btn').attr('disabled', true);

                    $('#video-url-input').attr('readonly', false);
                    $("#video-start-btn").attr('disabled', false);
                    $("#video-stop-btn").attr('disabled', true);
                    $("#video-pause-btn").attr('disabled', true);
                    $("#video-play-btn").attr('disabled', true);

                    $("#start-recording-btn").attr('disabled', false);
                    $("#stop-recording-btn").attr('disabled', true);
                    $('#recording-status')
                        .removeClass('fa-circle').addClass('fa-stop-circle')
                        .removeClass('red').addClass('gray');

                    $('#rtmp-status').removeClass('red').addClass('gray');
                    $("#rtmp-url-input").attr('readonly', false);
                    $("#start-rtmp-btn").attr('disabled', false);
                    $("#stop-rtmp-btn").attr('disabled', true);

                    $('#send-message-btn').attr('disabled', false);
                })
                .catch((err) => logMessage(err));
      })
      .catch((err) => logMessage(err));
});

$("#conference-leave-btn").click(function() {
    // Leave the conference
    VoxeetSDK.conference.leave()
        .then(() => {
            $('#chk-live-recording').attr('disabled', false);

            $('#btn-set-output-audio-device').attr('disabled', true);
            $('#btn-set-input-audio-device').attr('disabled', true);
            $('#btn-set-video-device').attr('disabled', true);
            
            $("#conference-join-btn").attr('disabled', false);
            $("#conference-leave-btn").attr('disabled', true);
            $('#conference-alias-input').attr('readonly', false);

            $('[data-conference="on"] button').attr('disabled', true);

            $('#video-url-input').attr('readonly', false);

            $('#recording-status')
                .removeClass('fa-circle').addClass('fa-stop-circle')
                .removeClass('red').addClass('gray');

            $('#rtmp-status').removeClass('red').addClass('gray');
            $("#rtmp-url-input").attr('readonly', false);

            // Empty the last video elements
            $('#streams-containers').empty();
        })
        .catch((e) => logMessage(e));
});

$("#btn-set-video-device").click(async () => {
    await VoxeetSDK.mediaDevice.selectVideoInput($('#video-devices').val());
});

$("#btn-set-input-audio-device").click(async () => {
    await VoxeetSDK.mediaDevice.selectAudioInput($('#input-audio-devices').val());
});

$("#btn-set-output-audio-device").click(async () => {
    await VoxeetSDK.mediaDevice.selectAudioOutput($('#output-audio-devices').val());
});



$("#start-video-btn").click(() => {
    const payloadConstraints = webRtcConstraints;
    payloadConstraints.video.deviceId = $('#video-devices').val();
    logMessage(`VoxeetSDK.conference.startVideo with ${JSON.stringify(payloadConstraints)}`);

    // Start sharing the video with the other participants
    VoxeetSDK.conference.startVideo(VoxeetSDK.session.participant, payloadConstraints)
        .then(() => {
            $("#start-video-btn").attr('disabled', true);
            $("#stop-video-btn").attr('disabled', false);
        })
        .catch((err) => logMessage(err));
});

$("#stop-video-btn").click(() => {
    logMessage("VoxeetSDK.conference.stopVideo");

    // Stop sharing the video with the other participants
    VoxeetSDK.conference.stopVideo(VoxeetSDK.session.participant)
        .then(() => {
            $("#start-video-btn").attr('disabled', false);
            $("#stop-video-btn").attr('disabled', true);
        })
        .catch((err) => logMessage(err));
});

// Add a video stream to the web page
const addVideoNode = (participant, stream) => {
    let element = $(`#stream-${participant.id}`);
    if (!element.length) {
        let data = {
            id: participant.id,
            name: participant.info.name
        };
    
        let template = $.templates("#template-video");
        element = $(template.render(data));
    
        $("#streams-containers").append(element);
    }

    updateVideoMessage(participant, stream);

    // Attach the video steam to the video element
    let video = element.find('video')[0];
    navigator.attachMediaStream(video, stream);
};
  
const updateVideoMessage = (participant, stream) => {
    let element = $(`#stream-${participant.id}`);
    if (element.length) {
        let text = 'unknown resolution';
        if (stream.getVideoTracks().length > 0) {
            let streamSettings = stream.getVideoTracks()[0].getSettings();
            if (streamSettings && streamSettings.width) {
                text = `Resolution ${streamSettings.width} x ${streamSettings.height}`;
            }
        }

        element.find('.resolution').text(text);
    }
}
  
// Remove the video stream from the web page
const removeVideoNode = (participant) => {
    $(`#stream-${participant.id}`).remove();
};



$("#start-audio-btn").click(() => {
    logMessage("VoxeetSDK.conference.startAudio");

    // Start sharing the audio with the other participants
    VoxeetSDK.conference.startAudio(VoxeetSDK.session.participant)
        .then(() => VoxeetSDK.mediaDevice.selectAudioInput($('#input-audio-devices').val()).then(() => {}))
        .then(() => {
            $("#start-audio-btn").attr('disabled', true);
            $("#stop-audio-btn").attr('disabled', false);
            $("#mute-audio-btn").attr('disabled', false);
            $("#unmute-audio-btn").attr('disabled', true);
        })
        .catch((err) => logMessage(err));
});

$("#stop-audio-btn").click(() => {
    logErrors("VoxeetSDK.conference.stopAudio");

    // Stop sharing the audio with the other participants
    VoxeetSDK.conference.stopAudio(VoxeetSDK.session.participant)
        .then(() => {
            $("#start-audio-btn").attr('disabled', false);
            $("#stop-audio-btn").attr('disabled', true);
            $("#mute-audio-btn").attr('disabled', true);
            $("#unmute-audio-btn").attr('disabled', true);
        })
        .catch((err) => logErrors(err));
});

$("#mute-audio-btn").click(() => {
    logMessage("VoxeetSDK.conference.mute true");
    VoxeetSDK.conference.mute(VoxeetSDK.session.participant, true);

    $("#mute-audio-btn").attr('disabled', true);
    $("#unmute-audio-btn").attr('disabled', false);
});

$("#unmute-audio-btn").click(() => {
    logMessage("VoxeetSDK.conference.mute false");
    VoxeetSDK.conference.mute(VoxeetSDK.session.participant, false);

    $("#mute-audio-btn").attr('disabled', false);
    $("#unmute-audio-btn").attr('disabled', true);
});



$("#start-screenshare-btn").click(() => {
    logMessage('VoxeetSDK.conference.startScreenShare');

    // Start screen sharing with the other participants
    VoxeetSDK.conference.startScreenShare()
        .then(() => {
            $("#start-screenshare-btn").attr('disabled', true);
            $("#stop-screenshare-btn").attr('disabled', false);
        })
        .catch((err) => logMessage(err));
});

$("#stop-screenshare-btn").click(() => {
    logMessage("VoxeetSDK.conference.stopScreenShare");

    // Stop screen sharing with the other participants
    VoxeetSDK.conference.stopScreenShare()
        .then(() => {
            $("#start-screenshare-btn").attr('disabled', false);
            $("#stop-screenshare-btn").attr('disabled', true);
        })
        .catch((err) => logMessage(err));
});

// Add a screen share stream to the web page
const addScreenShareNode = (participant, stream) => {
    let element = $('#stream-screenshare');
    if (!element.length) {
        let data = {
            name: participant.info.name
        };
    
        let template = $.templates("#template-screenshare");
        element = $(template.render(data));
    
        $("#streams-containers").append(element);
    }

    // Attach the video steam to the video element
    let video = element.find('video')[0];
    navigator.attachMediaStream(video, stream);
}

// Remove the screen share stream from the web page
const removeScreenShareNode = () => {
    $('#stream-screenshare').remove();

    $("#start-screenshare-btn").attr('disabled', false);
    $("#stop-screenshare-btn").attr('disabled', true);
}
  

// Add a new participant to the list
const addParticipantNode = (participant) => {
    // If the participant is the current session user, don't add himself to the list
    if (participant.id === VoxeetSDK.session.participant.id) return;
  
    $('<li />')
        .attr('id', `participant-${participant.id}`)
        .text(participant.info.name)
        .appendTo('#participants-list');
};

// Remove a participant from the list
const removeParticipantNode = (participant) => {
    $(`#participant-${participant.id}`).remove();
};



$("#video-start-btn").click(() => {
    const videoUrl = $('#video-url-input').val();
    logMessage(`VoxeetSDK.videoPresentation.start ${videoUrl}`);

    VoxeetSDK.videoPresentation
        .start(videoUrl)
        .then(() => {
            $('#video-url-input').attr('readonly', true);
            $("#video-start-btn").attr('disabled', true);
            $("#video-stop-btn").attr('disabled', false);
            $("#video-pause-btn").attr('disabled', false);
            $("#video-play-btn").attr('disabled', true);
        })
        .catch((err) => logMessage(err));
});

$("#video-stop-btn").click(() => {
    logMessage('VoxeetSDK.videoPresentation.stop');
    VoxeetSDK.videoPresentation
        .stop()
        .then(() => {
            $('#video-url-input').attr('readonly', false);
            $("#video-start-btn").attr('disabled', false);
            $("#video-stop-btn").attr('disabled', true);
            $("#video-pause-btn").attr('disabled', true);
            $("#video-play-btn").attr('disabled', true);
        })
        .catch((err) => logMessage(err));
});

$("#video-pause-btn").click(() => {
    const timestamp = VoxeetSDK.videoPresentation.current.timestamp;
    logMessage(`VoxeetSDK.videoPresentation.pause ${timestamp}`);
    VoxeetSDK.videoPresentation
        .pause(timestamp)
        .then(() => {
            $("#video-pause-btn").attr('disabled', true);
            $("#video-play-btn").attr('disabled', false);
        })
        .catch((err) => logMessage(err));
});

$("#video-play-btn").click(() => {
    logMessage('VoxeetSDK.videoPresentation.play');
    VoxeetSDK.videoPresentation
        .play()
        .then(() => {
            $("#video-pause-btn").attr('disabled', false);
            $("#video-play-btn").attr('disabled', true);
        })
        .catch((err) => logMessage(err));
});

const addVideoPlayer = (videoUrl) => {
    let element = $(`#stream-video`);
    if (!element.length) {
        let data = {
            url: videoUrl
        };
    
        let template = $.templates("#template-video-url");
        element = $(template.render(data));
    
        $("#streams-containers").append(element);
    }
};



$("#start-recording-btn").click(() => {
    logMessage('VoxeetSDK.recording.start()');

    // Start recording the conference
    VoxeetSDK.recording.start()
        .then(() => {
            $('#recording-status')
                .removeClass('fa-stop-circle').addClass('fa-circle')
                .removeClass('gray').addClass('red');

            $("#start-recording-btn").attr('disabled', true);
            $("#stop-recording-btn").attr('disabled', false);
        })
        .catch((err) => logMessage(err));
});

$("#stop-recording-btn").click(() => {
    logMessage('VoxeetSDK.recording.stop()');
    
    // Stop recording the conference
    VoxeetSDK.recording.stop()
        .then(() => {
            $('#recording-status')
                .removeClass('fa-circle').addClass('fa-stop-circle')
                .removeClass('red').addClass('gray');

            $("#start-recording-btn").attr('disabled', false);
            $("#stop-recording-btn").attr('disabled', true);
        })
        .catch((err) => logMessage(err));
});



$("#start-rtmp-btn").click(() => {
    const rtmpUrl = $('#rtmp-url-input').val();
    logMessage(`Start RTMP stream to ${rtmpUrl}`);

    const url = `https://session.voxeet.com/v1/api/conferences/mix/${conferenceId}/live/start`;
    $.ajax({
        type: "POST",
        url: url,
        contentType: "application/json",
        dataType: 'json',
        data: JSON.stringify({ uri: rtmpUrl }),
        headers: {
            "Authorization": "Basic: " + btoa(`${consumerKey}:${consumerSecret}`),
            "Content-type": "application/json"
        }
    });

    $('#rtmp-status').addClass('red').removeClass('gray');
    $("#rtmp-url-input").attr('readonly', true);
    $("#start-rtmp-btn").attr('disabled', true);
    $("#stop-rtmp-btn").attr('disabled', false);
});

$("#stop-rtmp-btn").click(() => {
    logMessage('Stop the RTMP stream');

    const url = `https://session.voxeet.com/v1/api/conferences/mix/${conferenceId}/live/stop`;
    $.ajax({
        type: "POST",
        url: url,
        headers: {
            "Authorization": "Basic: " + btoa(`${consumerKey}:${consumerSecret}`),
            "Content-type": "application/json"
        }
    });

    $('#rtmp-status').removeClass('red').addClass('gray');
    $("#rtmp-url-input").attr('readonly', false);
    $("#start-rtmp-btn").attr('disabled', false);
    $("#stop-rtmp-btn").attr('disabled', true);
});



$('#send-message-btn').click(() => {
    logMessage('VoxeetSDK.command.send()');

    VoxeetSDK.command
        .send($("#message-input").val())
        .then(() => {
            $("#message-input").val();
        })
        .catch((err) => logMessage(err));
});


$(function() {

    // Initialize the Voxeet SDK
    VoxeetSDK.initialize(consumerKey, consumerSecret);
    logMessage("The Voxeet SDK has been initialized");

     // Generate a random username
    let randomUsername = "Guest " + Math.round(Math.random() * 10000);
    $('#username-input').val(randomUsername);

    // Generate a random conference alias
    let conferenceAlias = "conf-" + Math.round(Math.random() * 10000);
    $('#conference-alias-input').val(conferenceAlias);
    
    // Set the Voxeet SDK Version
    $('#sdk-version').text(VoxeetSDK.version);

});
