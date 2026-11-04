import { describe, expect, it } from "vitest";
import { TestDriver } from "testdriverai/vitest/hooks";

describe("PageGuide Web Demo", () => {
  it("verifies the PageGuide library and unlocks admin mode with credentials", async (context) => {
    const testdriver = TestDriver(context);

    // Provision Chrome with the production PageGuide web app
    await testdriver.provision.chrome({ url: "https://pageguide-demo.vercel.app" });

    // Verify the library title is visible
    const title = await testdriver.find("Navigate a Webpage");
    expect(title).toBeTruthy();

    // Verify the demo chat input is present
    const chatInput = await testdriver.find("Your next move?");
    await chatInput.click();

    // Type the admin unlock command using example credentials
    await testdriver.type("/admin admin2026pageguide");
    await testdriver.pressKeys(["enter"]);

    // Assert that admin mode is successfully turned on
    const assertResult = await testdriver.assert("Admin mode is enabled and shows Admin mode on");
    expect(assertResult).toBeTruthy();
  });

  it("opens the Amazon sandbox fixture and verifies interactive demo controls", async (context) => {
    const testdriver = TestDriver(context);

    // Provision Chrome with the production PageGuide web app
    await testdriver.provision.chrome({ url: "https://pageguide-demo.vercel.app" });

    // Open the Amazon sandbox interactive demo fixture
    const amazonDemo = await testdriver.find("Amazon sandbox");
    await amazonDemo.click();

    // Verify the Amazon demo store loads with product listings
    const assertResult = await testdriver.assert("the Amazon demo store is visible with product items");
    expect(assertResult).toBeTruthy();
  });
});
