const { getDateWIB } = require("../time");

describe("getDateWIB", () => {
  const RealDate = Date;

  beforeAll(() => {
    // Mock Date to fixed value
    global.Date = class extends RealDate {
      constructor() {
        super();
        return new RealDate("2025-05-09T12:34:56Z"); // UTC
      }
    };
  });

  afterAll(() => {
    global.Date = RealDate;
  });

  it("returns date in YYYY-MM-DD format (Asia/Jakarta)", () => {
    const result = getDateWIB();
    // Jakarta is UTC+7, so this should be 2025-05-09
    expect(result).toBe("2025-05-09");
  });
});
