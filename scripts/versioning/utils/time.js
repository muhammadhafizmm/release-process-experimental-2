/**
 * getDateWIB - Get the current date in 'YYYY-MM-DD' format for Asia/Jakarta timezone
 * @returns {string} - The current date in 'YYYY-MM-DD' format
 */
function getDateWIB() {
  return new Date()
    .toLocaleDateString("id-ID", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    .split("/")
    .reverse()
    .join("-");
}

module.exports = {
  getDateWIB,
};
