const logMessage = (message) => {
    console.log(`${new Date().toISOString()} - ${message}`);
    $('#logs-area').val((_, text) => `${text}${new Date().toISOString()} - ${message}\r\n` );

    // Scroll to the end
    $('#logs-area').scrollTop($('#logs-area')[0].scrollHeight);
};

const logError = (message) => {
    console.error(`${new Date().toISOString()} - ${message}`);
    $('#logs-area').val((_, text) => `${text}${new Date().toISOString()} - ${message}\r\n` );

    // Scroll to the end
    $('#logs-area').scrollTop($('#logs-area')[0].scrollHeight);
};

/**
 * Initialize the SDK with an access token
 */

$("#initialize-btn").click(() => {
    const accessToken = $('#access-token-input').val();
    initializeSDK(accessToken);
});

const initializeSDK = (accessToken) => {
    const token = accessToken.split('.')[1];
    const jwt = JSON.parse(window.atob(token));
    accessTokenExpiration = new Date(jwt.exp * 1000);
    if (accessTokenExpiration.getTime() <= new Date().getTime()) {
        logError('The access token you have provided has expired.');
        return;
    }

    logMessage(`Initialize the SDK with the Access Token: ${accessToken}`);
    logMessage(`Access Token Expiration: ${accessTokenExpiration}`);

    VoxeetSDK.initializeToken(accessToken, () => new Promise((resolve) => resolve(accessToken)));

    $('#initialize-btn').attr('disabled', true);
    $('#connect-btn').attr('disabled', false);
};

var conferenceId;
var conferenceAccessToken;

const getConstraints = () => {
    let video = true;

    let value = $('#webrtc-constraints').val();
    if (value === "640") {
        video = { width: 640, height: 360 };
    } else if (value === "960") {
        video = { width: 960, height: 540 };
    } else if (value === "1280") {
        video = { width: 1280, height: 720 };
    } else if (value === "min640") {
        video = { width: { min: 640 }, height: { min: 360 } };
    } else if (value === "min960") {
        video = { width: { min: 960 }, height: { min: 540 } };
    } else if (value === "min1280") {
        video = { width: { min: 1280 }, height: { min: 720 } };
    }

    return {
        constraints: {
            audio: true,
            video: video
        }
    };
};

$("#btn-set-webrtc-constraints").click(() => {
    VoxeetSDK.session.participant.streams.forEach(stream => {
        if (stream.active && stream.type === "Camera") {
            logMessage("VoxeetSDK.conference.stopVideo");

            // Stop the video and restart it with the new constraints
            VoxeetSDK.conference
                .stopVideo(VoxeetSDK.session.participant)
                .then(startVideo)
                .catch((err) => logError(err));
            return;
        }
    });
});

$("#connect-btn").click(() => {
    const externalId = $('#external-id-input').val();
    const username = $('#username-input').val();
    const avatarUrl = $('#avatar-url-input').val();
  
    // Open a session to the Dolby.io APIs
    VoxeetSDK.session
        .open({ name: username, externalId: externalId, avatarUrl: avatarUrl })
        .then(() => {
            // Update the login message with the name of the user
            $('#title').text(`You are connected as ${username}`);
            $('#conference-join-btn').attr('disabled', false);
            $('#conference-listen-btn').attr('disabled', false);
            $('#connect-btn').attr('disabled', true);
            $('#external-id-input').attr('readonly', true);
            $('#username-input').attr('readonly', true);
            $('#avatar-url-input').attr('readonly', true);
        })
        .then(() => logMessage(`You are connected as ${username}`))
        .catch((e) => logError(e));
});

$("#conference-join-btn").click(() => {
    const liveRecording = $('#chk-live-recording')[0].checked;
    const dolbyVoice = $('#chk-dolby-voice')[0].checked;

    // Default conference parameters
    // See: https://docs.dolby.io/interactivity/docs/js-client-sdk-model-conferenceparameters
    let conferenceParams = {
        liveRecording: liveRecording,
        rtcpMode: "average", // worst, average, max
        ttl: 0,
        videoCodec: "H264", // H264, VP8
        dolbyVoice: dolbyVoice
    };

    // See: https://docs.dolby.io/interactivity/docs/js-client-sdk-model-conferenceoptions
    let conferenceOptions = {
        alias: $('#conference-alias-input').val(),
        params: conferenceParams
    };

    // 1. Create a conference room with an alias
    VoxeetSDK.conference.create(conferenceOptions)
        .then((conference) => {
            logMessage(`Conference id: ${conference.id} & Conference alias ${conference.alias}`);
            conferenceId = conference.id;

            // See: https://docs.dolby.io/interactivity/docs/js-client-sdk-model-joinoptions
            const joinOptions = getConstraints();
            joinOptions.simulcast = false;
            if (conferenceAccessToken) {
                joinOptions.conferenceAccessToken = conferenceAccessToken;
            }

            logMessage("Join the conference with the options:");
            logMessage(JSON.stringify(joinOptions));

            // 2. Join the conference
            return VoxeetSDK.conference.join(conference, joinOptions)
                .then(() => {
                    //sunscribe to the participant joined/left events
                    VoxeetSDK.notification.subscribe([{
                        type: "Participant.Left",
                        conferenceAlias: conference.alias
                    },
                    {
                        type: "Participant.Joined",
                        conferenceAlias: conference.alias
                    },
                    {
                        type: "Conference.ActiveParticipants",
                        conferenceAlias: conference.alias
                    }]);

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
                        .catch(err => logError(err));

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
                        .catch(err => logError(err));

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
                        .catch(err => logError(err));
                })
                .then(() => {
                    $('#btn-set-webrtc-constraints').attr('disabled', false);

                    $('#chk-live-recording').attr('disabled', true);
                    $('#conference-join-btn').attr('disabled', true);
                    $('#conference-listen-btn').attr('disabled', true);
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
                    $('#send-invitation-btn').attr('disabled', false);

                    setRecordingState(VoxeetSDK.recording.current != null);
                });
      })
      .catch((err) => logError(err));
});

$("#conference-listen-btn").click(function() {
    const liveRecording = $('#chk-live-recording')[0].checked;
    const dolbyVoice = $('#chk-dolby-voice')[0].checked;

    // Default conference parameters
    // See: https://docs.dolby.io/interactivity/docs/js-client-sdk-model-conferenceparameters
    let conferenceParams = {
        liveRecording: liveRecording,
        rtcpMode: "average", // worst, average, max
        ttl: 0,
        videoCodec: "H264", // H264, VP8
        dolbyVoice: dolbyVoice
    };

    // See: https://docs.dolby.io/interactivity/docs/js-client-sdk-model-conferenceoptions
    let conferenceOptions = {
        alias: $('#conference-alias-input').val(),
        params: conferenceParams
    };

    // 1. Create a conference room with an alias
    VoxeetSDK.conference.create(conferenceOptions)
        .then((conference) => {
            logMessage(`Conference id: ${conference.id} & Conference alias ${conference.alias}`);
            conferenceId = conference.id;

            let listenOptions = {};
            if (conferenceAccessToken) {
                listenOptions.conferenceAccessToken = conferenceAccessToken;
            }

            // 2. Join the conference
            return VoxeetSDK.conference.listen(conference, listenOptions)
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
                        .catch(err => logError(err));
                })
                .then(() => {
                    $('#btn-set-webrtc-constraints').attr('disabled', false);

                    $('#chk-live-recording').attr('disabled', true);
                    $('#conference-join-btn').attr('disabled', true);
                    $('#conference-listen-btn').attr('disabled', true);
                    $('#conference-leave-btn').attr('disabled', false);
                    $('#conference-alias-input').attr('readonly', true);

                    $('#start-video-btn').attr('disabled', true);
                    $('#stop-video-btn').attr('disabled', true);

                    $('#start-audio-btn').attr('disabled', true);
                    $('#stop-audio-btn').attr('disabled', true);
                    $('#mute-audio-btn').attr('disabled', true);
                    $('#unmute-audio-btn').attr('disabled', true);

                    $('#start-screenshare-btn').attr('disabled', true);
                    $('#stop-screenshare-btn').attr('disabled', true);

                    $('#video-url-input').attr('readonly', true);
                    $("#video-start-btn").attr('disabled', true);
                    $("#video-stop-btn").attr('disabled', true);
                    $("#video-pause-btn").attr('disabled', true);
                    $("#video-play-btn").attr('disabled', true);

                    $("#start-recording-btn").attr('disabled', true);
                    $("#stop-recording-btn").attr('disabled', true);
                    $('#recording-status')
                        .removeClass('fa-circle').addClass('fa-stop-circle')
                        .removeClass('red').addClass('gray');

                    $('#rtmp-status').removeClass('red').addClass('gray');
                    $("#rtmp-url-input").attr('readonly', false);
                    $("#start-rtmp-btn").attr('disabled', true);
                    $("#stop-rtmp-btn").attr('disabled', true);

                    $('#send-message-btn').attr('disabled', false);
                    $('#send-invitation-btn').attr('disabled', false);

                    setRecordingState(VoxeetSDK.recording.current != null);
                });
      })
      .catch((err) => logMessage(err));
});

$("#conference-leave-btn").click(function() {
    // Leave the conference
    VoxeetSDK.conference.leave()
        .then(() => {
            conferenceAccessToken = null;

            $('#chk-live-recording').attr('disabled', false);

            $('#btn-set-output-audio-device').attr('disabled', true);
            $('#btn-set-input-audio-device').attr('disabled', true);
            $('#btn-set-video-device').attr('disabled', true);
            
            $('#btn-set-webrtc-constraints').attr('disabled', true);

            $("#conference-join-btn").attr('disabled', false);
            $("#conference-listen-btn").attr('disabled', false);
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
            // Empty the list of participants
            $('#participants-list').empty();
        })
        .catch((e) => logError(e));
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


const startVideo = () => {
    const payloadConstraints = getConstraints();
    payloadConstraints.constraints.video.deviceId = $('#video-devices').val();
    logMessage("VoxeetSDK.conference.startVideo with the options:");
    logMessage(JSON.stringify(payloadConstraints.constraints.video));

    // Start sharing the video with the other participants
    VoxeetSDK.conference
        .startVideo(VoxeetSDK.session.participant, payloadConstraints.constraints.video)
        .then(() => {
            $("#start-video-btn").attr('disabled', true);
            $("#stop-video-btn").attr('disabled', false);
        })
        .catch((err) => logError(err));
};

$("#start-video-btn").click(startVideo);

$("#stop-video-btn").click(() => {
    logMessage("VoxeetSDK.conference.stopVideo");

    // Stop sharing the video with the other participants
    VoxeetSDK.conference.stopVideo(VoxeetSDK.session.participant)
        .then(() => {
            $("#start-video-btn").attr('disabled', false);
            $("#stop-video-btn").attr('disabled', true);
        })
        .catch((err) => logError(err));
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
    const video = $(`#stream-${participant.id} video`);
    if (video.length) {
        video[0].srcObject = null; // Prevent memory leak in Chrome
    }
    $(`#stream-${participant.id}`).remove();
};



$("#start-audio-btn").click(() => {
    logMessage("VoxeetSDK.conference.startAudio");

    // Start sharing the audio with the other participants
    VoxeetSDK.conference.startAudio(VoxeetSDK.session.participant)
        .then(() => VoxeetSDK.mediaDevice.selectAudioInput($('#input-audio-devices').val()))
        .then(() => {
            $("#start-audio-btn").attr('disabled', true);
            $("#stop-audio-btn").attr('disabled', false);
            $("#mute-audio-btn").attr('disabled', false);
            $("#unmute-audio-btn").attr('disabled', true);
        })
        .catch((err) => logError(err));
});

$("#stop-audio-btn").click(() => {
    logMessage("VoxeetSDK.conference.stopAudio");

    // Stop sharing the audio with the other participants
    VoxeetSDK.conference.stopAudio(VoxeetSDK.session.participant)
        .then(() => {
            $("#start-audio-btn").attr('disabled', false);
            $("#stop-audio-btn").attr('disabled', true);
            $("#mute-audio-btn").attr('disabled', true);
            $("#unmute-audio-btn").attr('disabled', true);
        })
        .catch((err) => logError(err));
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
        .catch((err) => logError(err));
});

$("#stop-screenshare-btn").click(() => {
    logMessage("VoxeetSDK.conference.stopScreenShare");

    // Stop screen sharing with the other participants
    VoxeetSDK.conference.stopScreenShare()
        .then(() => {
            $("#start-screenshare-btn").attr('disabled', false);
            $("#stop-screenshare-btn").attr('disabled', true);
        })
        .catch((err) => logError(err));
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
    const video = $('#stream-screenshare video');
    if (video.length) {
        video[0].srcObject = null; // Prevent memory leak in Chrome
    }
    $('#stream-screenshare').remove();

    $("#start-screenshare-btn").attr('disabled', false);
    $("#stop-screenshare-btn").attr('disabled', true);
}


// Add a new participant to the list
const addUpdateParticipantNode = (participant) => {
    let template = $.templates("#template-participant");

    let elem = $(`#participant-${participant.id}`);
    const element = $(template.render({
        id: participant.id,
        avatarUrl: participant.info.avatarUrl,
        name: participant.info.name,
        status: participant.status,
        isLocal: participant.id === VoxeetSDK.session.participant.id,
    }));

    if (!elem.length) {
        element.appendTo('#participants-list');
    } else {
        elem.replaceWith(element);
    }
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
        .catch((err) => logError(err));
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
        .catch((err) => logError(err));
});

$("#video-pause-btn").click(() => {
    const timestamp = Math.round($(`#stream-video video`)[0].currentTime * 1000);
    logMessage(`VoxeetSDK.videoPresentation.pause at ${timestamp}ms`);
    VoxeetSDK.videoPresentation
        .pause(timestamp)
        .then(() => {
            $("#video-pause-btn").attr('disabled', true);
            $("#video-play-btn").attr('disabled', false);
        })
        .catch((err) => logError(err));
});

$("#video-play-btn").click(() => {
    logMessage('VoxeetSDK.videoPresentation.play');
    VoxeetSDK.videoPresentation
        .play()
        .then(() => {
            $("#video-pause-btn").attr('disabled', false);
            $("#video-play-btn").attr('disabled', true);
        })
        .catch((err) => logError(err));
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


/**
 * RECORDING
 */

const setRecordingState = (isRecording) => {
    if (isRecording) {
        $('#recording-status')
            .removeClass('fa-stop-circle').addClass('fa-circle')
            .removeClass('gray').addClass('red');
    } else {
        $('#recording-status')
            .removeClass('fa-circle').addClass('fa-stop-circle')
            .removeClass('red').addClass('gray');
    }

    $("#start-recording-btn").attr('disabled', isRecording);
    $("#stop-recording-btn").attr('disabled', !isRecording);
};

$("#start-recording-btn").click(() => {
    logMessage('VoxeetSDK.recording.start()');

    // Start recording the conference
    VoxeetSDK.recording.start()
        .then(() => setRecordingState(true))
        .catch((err) => logError(err));
});

$("#stop-recording-btn").click(() => {
    logMessage('VoxeetSDK.recording.stop()');
    
    // Stop recording the conference
    VoxeetSDK.recording.stop()
        .then(() => setRecordingState(false))
        .catch((err) => logError(err));
});


/**
 * RTMP Streaming
 */

const getAccessToken = () => {
    return new Promise((resolve, reject) => {
        const authUrl = `https://api.voxeet.com/v1/auth/token`;
        $.ajax({
            async : true,
            type: "POST",
            url: authUrl,
            contentType: "application/x-www-form-urlencoded",
            data: "grant_type=client_credentials",
            headers: {
                "Authorization": "Basic: " + btoa(`${consumerKey}:${consumerSecret}`),
            }
        }).done(function (data) {
            resolve(data);
        }).fail(function (err) {
            reject(err);
        });
    })
};

$("#start-rtmp-btn").click(async () => {
    const rtmpUrl = $('#rtmp-url-input').val();
    logMessage(`Start RTMP stream to ${rtmpUrl}`);

    const jwt = await getAccessToken();

    const url = `https://api.voxeet.com/v2/conferences/mix/${conferenceId}/rtmp/start`;
    $.ajax({
        async : true,
        type: "POST",
        url: url,
        contentType: "application/json",
        dataType: 'json',
        data: JSON.stringify({ uri: rtmpUrl }),
        headers: {
            "Authorization": "Bearer " + jwt.access_token
        }
    }).done(function () {
        $('#rtmp-status').addClass('red').removeClass('gray');
        $("#rtmp-url-input").attr('readonly', true);
        $("#start-rtmp-btn").attr('disabled', true);
        $("#stop-rtmp-btn").attr('disabled', false);
    }).fail(function (err) {
        logError(err);
    });
});

$("#stop-rtmp-btn").click(async () => {
    logMessage('Stop the RTMP stream');

    const jwt = await getAccessToken();

    const url = `https://api.voxeet.com/v2/conferences/mix/${conferenceId}/rtmp/stop`;
    $.ajax({
        async : true,
        type: "POST",
        url: url,
        headers: {
            "Authorization": "Bearer " + jwt.access_token
        }
    }).done(function () {
        $('#rtmp-status').removeClass('red').addClass('gray');
        $("#rtmp-url-input").attr('readonly', false);
        $("#start-rtmp-btn").attr('disabled', false);
        $("#stop-rtmp-btn").attr('disabled', true);
    }).fail(function (err) {
        logError(err);
    });
});


/**
 * Send a message
 */

$('#send-message-btn').click(() => {
    logMessage('VoxeetSDK.command.send()');

    VoxeetSDK.command
        .send($("#message-input").val())
        .then(() => {
            $("#message-input").val();
        })
        .catch((err) => logError(err));
});


/**
 * Send invitation
 */

$('#send-invitation-btn').click(() => {
    const externalId = $("#invite-input").val();
    logMessage(`VoxeetSDK.notification.invite('${externalId}')`);

    var participants = [
        { externalId: externalId }
    ];

    VoxeetSDK.notification
        .invite(VoxeetSDK.conference.current, participants)
        .then(() => {
            logMessage(`Invitation sent to ${externalId}`);
        })
        .catch((err) => logError(err));
});


$(function() {
    // Automatically try to load the Access Token
    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get('token');
    if (accessToken && accessToken.length > 0) {
        $('#access-token-input').val(accessToken);
        initializeSDK(accessToken);
    }

    // Generate a random username
    let rand = Math.round(Math.random() * 10000);
    $('#external-id-input').val(`guest-${rand}`);
    $('#username-input').val(`Guest ${rand}`);
    $('#avatar-url-input').val(`https://gravatar.com/avatar/${rand}?s=200&d=identicon`);

    // Generate a random conference alias
    let conferenceAlias = "conf-" + Math.round(Math.random() * 10000);
    $('#conference-alias-input').val(conferenceAlias);

    // Set the Voxeet SDK Version
    $('#sdk-version').text(VoxeetSDK.version);
});
