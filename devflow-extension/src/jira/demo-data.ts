import { JiraIssue } from './types';

/** Demo data for testing flows without a Jira connection */
const DEMO_ISSUES: Record<string, JiraIssue> = {
    'DEMO-1': {
        key: 'DEMO-1',
        id: '10001',
        self: 'https://demo.atlassian.net/rest/api/3/issue/10001',
        fields: {
            summary: 'Error en el cálculo de descuentos cuando el usuario aplica dos cupones',
            description: 'Al aplicar dos cupones de descuento consecutivos, el segundo cupón se calcula sobre el precio original en vez del precio ya descontado. Esto causa que el descuento total sea mayor al esperado.\n\nPasos para reproducir:\n1. Añadir producto al carrito (100€)\n2. Aplicar cupón DESCUENTO10 (-10%)\n3. Aplicar cupón VERANO5 (-5%)\n\nResultado actual: 85€ (descuenta 15% del original)\nResultado esperado: 85.50€ (10% de 100 = 90, luego 5% de 90 = 85.50)',
            issuetype: { id: '1', name: 'Bug', description: 'A bug', subtask: false },
            priority: { id: '2', name: 'High' },
            status: { id: '3', name: 'To Do', statusCategory: { key: 'new', name: 'To Do' } },
            components: [{ id: '1', name: 'checkout' }, { id: '2', name: 'pricing-engine' }],
            labels: ['bug', 'pricing', 'production'],
            reporter: { accountId: 'user1', displayName: 'Ana García' },
            assignee: { accountId: 'user2', displayName: 'Rubén Giménez' },
            versions: [{ id: '1', name: '2.3.0', released: true }],
            fixVersions: [{ id: '2', name: '2.3.1', released: false }],
            created: '2026-03-28T10:00:00.000Z',
            updated: '2026-04-01T14:30:00.000Z'
        }
    },
    'DEMO-2': {
        key: 'DEMO-2',
        id: '10002',
        self: 'https://demo.atlassian.net/rest/api/3/issue/10002',
        fields: {
            summary: 'Como usuario quiero poder exportar mis pedidos en PDF',
            description: 'El usuario necesita poder descargar un PDF con el historial de pedidos filtrado por fecha. Debe incluir: número de pedido, fecha, productos, importes y estado.\n\nCriterios de aceptación:\n- Filtro por rango de fechas\n- Incluir desglose de IVA\n- Logo de la empresa en cabecera\n- Máximo 100 pedidos por descarga',
            issuetype: { id: '2', name: 'Story', description: 'A user story', subtask: false },
            priority: { id: '3', name: 'Medium' },
            status: { id: '3', name: 'To Do', statusCategory: { key: 'new', name: 'To Do' } },
            components: [{ id: '3', name: 'orders' }, { id: '4', name: 'reports' }],
            labels: ['feature', 'pdf', 'orders'],
            reporter: { accountId: 'user3', displayName: 'Carlos López', emailAddress: 'carlos@example.com' },
            assignee: { accountId: 'user2', displayName: 'Rubén Giménez' },
            versions: [],
            fixVersions: [{ id: '3', name: '2.4.0', released: false }],
            created: '2026-04-01T09:00:00.000Z',
            updated: '2026-04-01T09:00:00.000Z'
        }
    },
    'DEMO-3': {
        key: 'DEMO-3',
        id: '10003',
        self: 'https://demo.atlassian.net/rest/api/3/issue/10003',
        fields: {
            summary: 'Mejorar rendimiento de la página de listado de productos',
            description: 'La página de listado de productos tarda más de 3 segundos en cargar cuando hay más de 500 productos. Necesitamos implementar paginación del lado del servidor y lazy loading de imágenes.\n\nMétricas actuales:\n- First Contentful Paint: 2.8s\n- Time to Interactive: 4.1s\n- Largest Contentful Paint: 3.9s\n\nObjetivo: LCP < 1.5s',
            issuetype: { id: '4', name: 'Improvement', description: 'An improvement', subtask: false },
            priority: { id: '2', name: 'High' },
            status: { id: '3', name: 'To Do', statusCategory: { key: 'new', name: 'To Do' } },
            components: [{ id: '5', name: 'frontend' }, { id: '6', name: 'catalog' }],
            labels: ['performance', 'frontend'],
            reporter: { accountId: 'user1', displayName: 'Ana García' },
            assignee: null,
            versions: [{ id: '1', name: '2.3.0', released: true }],
            fixVersions: [{ id: '3', name: '2.4.0', released: false }],
            created: '2026-03-30T11:00:00.000Z',
            updated: '2026-03-31T16:00:00.000Z'
        }
    }
};

export function getDemoIssue(issueKey: string): JiraIssue | undefined {
    return DEMO_ISSUES[issueKey];
}

export function getAllDemoIssueKeys(): string[] {
    return Object.keys(DEMO_ISSUES);
}
