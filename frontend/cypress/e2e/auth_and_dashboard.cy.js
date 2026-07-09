// E2E del flujo crítico: registrarse, loguearse y ver el dashboard cargar
// señuelos + alertas. Corre contra el stack real (frontend:3000, backend:4000
// vía NEXT_PUBLIC_API_URL), no contra mocks — por eso en CI se levanta todo
// con docker compose antes de correr esto (ver .github/workflows/ci.yml).
const uniqueEmail = `qa-${Date.now()}@honey-intranet.test`;
const password = 'ClaveSegura123';

describe('Registro, login y dashboard', () => {
  it('permite registrarse, loguearse y ver el dashboard', () => {
    cy.request('POST', 'http://localhost:4000/auth/register', {
      email: uniqueEmail,
      password,
    }).its('status').should('eq', 201);

    cy.visit('/login');
    cy.get('#email').type(uniqueEmail);
    cy.get('#password').type(password);
    cy.contains('button', 'Entrar').click();

    cy.url().should('include', '/dashboard');
    cy.contains('Honey-Intranet Orchestrator').should('be.visible');
    cy.contains('Señuelos').should('be.visible');
    cy.contains('Alertas capturadas').should('be.visible');
  });

  it('rechaza login con credenciales inválidas', () => {
    cy.visit('/login');
    cy.get('#email').type('no-existe@honey-intranet.test');
    cy.get('#password').type('incorrecta123');
    cy.contains('button', 'Entrar').click();
    cy.contains('Credenciales inválidas').should('be.visible');
  });
});
