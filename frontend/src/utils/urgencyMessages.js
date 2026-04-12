/**
 * Dynamic Urgency Messages
 * Automatically rotates urgency messages based on current month
 */

export const URGENCY_MESSAGES = [
    { month: 0, text: "Only 2 spots left this month", spots: 2, period: "this month" },
    { month: 1, text: "Valentine's special: 3 slots remaining", spots: 3, period: "this week" },
    { month: 2, text: "Spring launch: 4 spots available", spots: 4, period: "this month" },
    { month: 3, text: "Q2 kickoff: Limited slots", spots: 3, period: "this quarter" },
    { month: 4, text: "Summer prep: 3 spots left", spots: 3, period: "this month" },
    { month: 5, text: "Mid-year boost: 2 slots open", spots: 2, period: "this week" },
    { month: 6, text: "Independence prep: 3 spots left", spots: 3, period: "this month" },
    { month: 7, text: "Back-to-school rush: 2 spots", spots: 2, period: "this week" },
    { month: 8, text: "Festival season: 3 slots left", spots: 3, period: "this month" },
    { month: 9, text: "Year-end push: Limited availability", spots: 2, period: "this quarter" },
    { month: 10, text: "Holiday rush: 2 spots remaining", spots: 2, period: "this week" },
    { month: 11, text: "New year prep: 3 slots left", spots: 3, period: "this month" }
];

/**
 * Get the urgency message for the current month
 * @returns {Object} Current month's urgency message
 */
export const getCurrentUrgencyMessage = () => {
    const currentMonth = new Date().getMonth(); // 0-11
    return URGENCY_MESSAGES[currentMonth];
};

/**
 * Get urgency message for a specific month (for testing)
 * @param {number} month - Month index (0-11)
 * @returns {Object} Urgency message for specified month
 */
export const getUrgencyMessageForMonth = (month) => {
    if (month < 0 || month > 11) {
        throw new Error('Month must be between 0 and 11');
    }
    return URGENCY_MESSAGES[month];
};

export default {
    URGENCY_MESSAGES,
    getCurrentUrgencyMessage,
    getUrgencyMessageForMonth
};
