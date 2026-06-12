const ALERT_TEMPLATES = {
    WARNING: {
        display: (t, distanceMeters) => t.alert_approaching_boundary.replace('{distance}', distanceMeters),
        speech: (t) => t.voice_warning_approaching_boundary,
        alertType: 'BORDER_WARNING',
        message: (distanceMeters) => `Boat is ${distanceMeters}m from border.`
    },
    WARNING_REEF: {
        display: (t) => t.alert_coral_reef,
        speech: (t) => t.voice_warning_coral_reef,
        alertType: 'BORDER_WARNING',
        message: () => 'Boat entered protected Coral Reef area.'
    },
    DANGER_SRI_LANKA: {
        display: (t) => t.alert_danger_sri_lanka,
        speech: (t) => t.voice_danger_sri_lanka,
        alertType: 'SOS',
        message: () => 'CRITICAL: Boat crossed into Sri Lankan Waters!'
    },
    DANGER: {
        display: (t) => t.alert_danger_left_zone,
        speech: (t) => t.voice_danger_left_zone,
        alertType: 'BORDER_WARNING',
        message: () => 'Boat has left authorized zone.'
    },
    SAFE: {
        display: (t) => t.alert_returned_safe_zone,
        speech: () => null,
        alertType: 'INFO',
        message: () => 'Boat returned to safe zone.'
    }
};

const AlertAgent = {
    generate({ status, distanceMeters, position, t, boatId }) {
        const template = ALERT_TEMPLATES[status] || ALERT_TEMPLATES.SAFE;

        return {
            displayText: template.display(t, distanceMeters),
            speechText: template.speech(t),
            systemPayload: {
                boatId,
                type: template.alertType,
                message: template.message(distanceMeters),
                lat: position?.[0],
                lng: position?.[1]
            }
        };
    }
};

export default AlertAgent;
