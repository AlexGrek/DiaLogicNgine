/**
 * Backend health check through the Vite dev-server proxy.
 */
describe("API health", () => {
  it("GET /api/v1/health returns ok", () => {
    cy.request("/api/v1/health").then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body).to.have.property("status", "ok");
    });
  });

  it("GET /api/v1/health/ready returns ok", () => {
    cy.request("/api/v1/health/ready").then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body).to.have.property("status", "ready");
    });
  });
});
