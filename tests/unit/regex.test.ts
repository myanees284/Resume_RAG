import {
  extractEmails,
  extractPhones,
  extractYearsOfExperience,
} from "../../src/modules/ingestion/utils/regex";

describe("regex utilities", () => {
  it("extracts 13 from 13+ years of experience", () => {
    expect(extractYearsOfExperience("13+ years of experience")).toBe(13);
  });

  it("extracts years without a plus sign", () => {
    expect(extractYearsOfExperience("5 yrs in testing")).toBe(5);
  });

  it("extracts emails", () => {
    expect(extractEmails("Contact: jane.doe@testleaf.com")).toEqual([
      "jane.doe@testleaf.com",
    ]);
  });

  it("extracts Indian phone numbers", () => {
    expect(extractPhones("Call +91 9876543210")).toEqual(
      expect.arrayContaining([expect.stringMatching(/9876543210/)])
    );
  });
});
