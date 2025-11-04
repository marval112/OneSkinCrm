

export const documentationContent = {
  en: {
    documentation: {
        title: "Help & Documentation",
        description: "Find guides, tutorials, and technical information to get the most out of OneSkin CRM.",
        searchPlaceholder: "Search documentation...",
        print: "Print Section",
        tabs: {
            userManual: "User Manual",
            faq: "FAQ",
            tutorials: "Tutorials",
            technicalGuide: "Technical Guide",
            shortcuts: "Shortcuts",
        }
    },
    userManual: {
        navigation: "Modules",
        dashboard: {
            title: "Dashboard Guide",
            content: `
The **Dashboard** is your main control center. It provides a real-time overview of your key business metrics.

*   **KPI Cards**: At the top, you'll find key performance indicators like Total Leads, Conversion Rate, Revenue, and Active Customers.
*   **Deals Funnel**: A visual representation of your sales pipeline, showing how many deals are in each stage.
*   **Lead Sources**: A pie chart breaking down where your leads are coming from.
*   **Top Leads**: A list of your 5 highest-scoring leads that require immediate attention.
*   **Date Range Filter**: All dashboard data can be filtered by specific time periods.
![Dashboard Mockup](https://i.imgur.com/8aZ4b2c.png)
`
        },
        leads: {
            title: "Leads Management",
            content: "A **Lead** is a potential sales contact—an individual or organization that expresses interest in your goods or services. The goal is to qualify and convert them into customers."
        },
        customers: {
            title: "Customers Management",
            content: "A **Customer** is an individual or business that has purchased goods or services from your company. This module helps you track their status, health, and history."
        },
        deals: {
            title: "Deals Pipeline",
            content: "The **Deals** module tracks potential revenue-generating opportunities through your sales pipeline. Each deal is associated with a customer and has a monetary value and a projected close date."
        },
        products: {
            title: "Product Catalog",
            content: "Manage your company's product and service offerings. Products can be organized into hierarchical categories and sub-categories."
        },
        reports: {
            title: "Scheduled Reports",
            content: "Automate your reporting. You can schedule reports on leads, deals, or revenue to be sent to specific recipients at a daily, weekly, or monthly frequency."
        },
        webhooks: {
            title: "Webhooks",
            content: "Use **Webhooks** to send real-time data from the CRM to external applications whenever specific events occur, such as a new lead being created."
        },
        integrations: {
            title: "Integrations Hub",
            content: "Connect OneSkin CRM with other popular services like Slack, Mailchimp, and Zapier to streamline your workflows."
        },

        alerts: {
            title: "Predictive Alerts",
            content: "The **Alerts** system proactively analyzes your data to identify important business events that require your attention, such as leads that are likely to convert ('Hot Leads') or customers at risk of leaving ('Churn Risk')."
        }
    },
    faq: {
        general: {
            title: "General Questions",
            items: [
                { q: "How do I filter and export data?", a: "In modules like Leads and Customers, use the search bar at the top to filter. The 'Export CSV' button will download the current view as a CSV file." },
                { q: "How do I customize the theme?", a: "Navigate to the 'Theme' page from the sidebar. You can select a preset or create your own color scheme using the customizer." }
            ]
        },
        leads: {
            title: "Leads",
            items: [
                { q: "What does 'Lead Score' mean?", a: "The Lead Score is a number from 0-100 that represents the sales-readiness of a lead. It's calculated based on factors like their source, company, and engagement. A higher score means a better lead." }
            ]
        },
        customers: {
            title: "Customers",
            items: [
                { q: "What is 'Health Score'?", a: "The Health Score indicates the likelihood of a customer to remain active and loyal. It's based on their activity, purchase history, and last contact date. A low score might indicate a churn risk." }
            ]
        },
        deals: {
            title: "Deals",
            items: [
                { q: "How is a Deal's probability calculated?", a: "The probability is an estimated percentage of how likely the deal is to be won. It's often tied to the deal's current stage in the pipeline." }
            ]
        },
        integrations: {
            title: "Integrations",
            items: [
                { q: "How do I set up a Webhook?", a: "Go to the Webhooks module, click 'Create Webhook', and provide the URL of your external service. Then, select the events (e.g., 'lead.created') that should trigger the webhook." }
            ]
        }
    },
    tutorials: {
        createLead: {
            title: "Your First Lead",
            description: "Follow these steps to add a new potential customer to your CRM.",
            steps: [
                "Navigate to the **Leads** module from the sidebar.",
                "Click the **New Lead** button in the top-right corner.",
                "Fill in the required fields like `Name` and `Email` in the modal that appears.",
                "Select a `Source` and initial `Status`.",
                "Click **Save Lead**. The system will automatically calculate an initial lead score."
            ]
        },
        manageDeal: {
            title: "Managing a Deal",
            description: "Learn how to move a deal through your sales pipeline from start to finish.",
            steps: [
                "Go to the **Deals** module.",
                "Click **New Deal** and associate it with an existing customer.",
                "Define the `Value` and `Expected Close Date`.",
                "As you make progress, edit the deal and update its `Stage` (e.g., from 'Qualification' to 'Proposal').",
                "Once the outcome is known, set the stage to `Closed Won` or `Closed Lost`."
            ]
        },
        setupReport: {
            title: "Scheduling a Report",
            description: "Automate your reporting to keep your team informed.",
            steps: [
                "Navigate to the **Reports** module.",
                "Click **New Report**.",
                "Give the report a descriptive name, like 'Weekly Sales Pipeline'.",
                "Choose the `Report Type` (e.g., Deals), `Frequency` (e.g., Weekly), and `Format` (e.g., PDF).",
                "Enter the email addresses of the recipients, separated by commas.",
                "Click **Save Report**. The report will now be sent automatically based on your schedule."
            ]
        },
        createWebhook: {
            title: "Creating a Webhook",
            description: "Send real-time updates to other applications.",
            steps: [
                "Go to the **Webhooks** page.",
                "Click **Create Webhook**.",
                "Enter the `Endpoint URL` provided by the external application (e.g., Zapier).",
                "Select the `Events` that should trigger this webhook, for example, `lead.created`.",
                "Click **Save**. Now, every time a new lead is created, the CRM will send a POST request with the lead's data to your URL."
            ]
        }
    },
    technicalGuide: {
        architecture: {
            title: "System Architecture",
            description: "The OneSkin CRM is a modern web application built with React, TypeScript, and Tailwind CSS. The backend is powered by Supabase, which provides a PostgreSQL database, authentication, and storage."
        },
        databaseSchema: {
            title: "Database Schema (SQL)",
            description: "The following SQL script can be used to create all the necessary tables and relationships in your Supabase project. **This script is safe to re-run at any time.** It will create tables if they don't exist and add missing columns (like `segment`, `parent_id`, `active`, `sku`) to support upgrades from older versions without losing data.",
            sql: `
-- Create Users Table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('Admin', 'Commercial'))
);

-- Create Countries Table
CREATE TABLE IF NOT EXISTS countries (
  code VARCHAR(2) PRIMARY KEY,
  name VARCHAR(255) NOT NULL
);

-- Create Product Categories Table (Hierarchical)
CREATE TABLE IF NOT EXISTS product_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT
);
-- Add parent_id column if it doesn't exist.
ALTER TABLE product_categories ADD COLUMN IF NOT EXISTS parent_id INT REFERENCES product_categories(id) ON DELETE SET NULL;


-- Create Products Table
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL,
  category_id INT REFERENCES product_categories(id) ON DELETE SET NULL
);
-- Add active and sku columns if they don't exist.
ALTER TABLE products ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sku VARCHAR(255) NOT NULL DEFAULT 'SKU_PENDING';


-- Create Leads Table
CREATE TABLE IF NOT EXISTS leads (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  name VARCHAR(255) NOT NULL,
  company VARCHAR(255),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50),
  country VARCHAR(255),
  status VARCHAR(50) NOT NULL,
  source VARCHAR(50) NOT NULL,
  score INT DEFAULT 0,
  notes TEXT
);
-- Add segment column if it doesn't exist.
ALTER TABLE leads ADD COLUMN IF NOT EXISTS segment VARCHAR(50);


-- Create Customers Table
CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  name VARCHAR(255) NOT NULL,
  company VARCHAR(255),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50),
  country VARCHAR(255),
  status VARCHAR(50) NOT NULL,
  health_score INT DEFAULT 75,
  last_contact TIMESTAMPTZ
);
-- Add segment column if it doesn't exist.
ALTER TABLE customers ADD COLUMN IF NOT EXISTS segment VARCHAR(50);

-- Create Deals Table
CREATE TABLE IF NOT EXISTS deals (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  title VARCHAR(255) NOT NULL,
  customer_id INT REFERENCES customers(id) ON DELETE SET NULL,
  value NUMERIC(12, 2) NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL,
  probability INT,
  expected_close_date DATE,
  notes TEXT
);

-- Create Scheduled Reports Table
CREATE TABLE IF NOT EXISTS scheduled_reports (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  name VARCHAR(255) NOT NULL,
  report_type VARCHAR(50),
  frequency VARCHAR(50) NOT NULL,
  recipients TEXT[] NOT NULL,
  format VARCHAR(20),
  last_run TIMESTAMPTZ,
  next_run TIMESTAMPTZ
);

-- Create Webhooks Table
CREATE TABLE IF NOT EXISTS webhooks (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  name VARCHAR(255),
  url VARCHAR(2048) NOT NULL,
  events TEXT[] NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  last_triggered TIMESTAMPTZ
);

-- Create Integrations Table
CREATE TABLE IF NOT EXISTS connected_integrations (
  id TEXT PRIMARY KEY
);
`
        },
        apiReference: {
            title: "API Service Reference",
            description: "Overview of the main functions available in the frontend services.",
            reference: {
                "services/crmService.ts": [
                    "getLeads()",
                    "createLead(leadData)",
                    "updateLead(leadData)",
                    "getCustomers()",
                    "createCustomer(customerData)",
                    "getDeals()"
                ],
                "services/productService.ts": [
                    "getProducts()",
                    "createProduct(productData)",
                    "getProductCategories()"
                ]
            }
        },
        webhooks: {
            title: "Webhook Payloads",
            description: "When an event triggers a webhook, the CRM sends a POST request with a JSON payload. Here are some examples.",
            payloads: {
                "lead.created": {
                    "event": "lead.created",
                    "timestamp": "2024-08-01T12:00:00Z",
                    "data": {
                        "id": 1,
                        "name": "Carlos Gomez",
                        "company": "Reformas Express",
                        "email": "carlos.g@ref-express.com",
                        "country": "Spain",
                        "status": "New",
                        "source": "Website",
                        "score": 75
                    }
                }
            }
        }
    },
    keyboardShortcuts: {
        general: {
            title: "General Shortcuts",
            shortcuts: [
                { keys: "Esc", action: "Close any open modal or dialog." },
                { keys: "Ctrl + F", action: "Focus the main search bar in a list view." }
            ]
        },
        navigation: {
            title: "Navigation",
            shortcuts: [
                { keys: "Alt + D", action: "Go to Dashboard" },
                { keys: "Alt + L", action: "Go to Leads" },
                { keys: "Alt + C", action: "Go to Customers" }
            ]
        },
        actions: {
            title: "Actions",
            shortcuts: [
                { keys: "Ctrl + N", action: "Open the 'New Item' modal (e.g., New Lead)." },
                { keys: "Ctrl + S", action: "Save the form in the currently open modal." }
            ]
        }
    }
  },
  es: {
    documentation: {
        title: "Ayuda y Documentación",
        description: "Encuentra guías, tutoriales e información técnica para sacar el máximo provecho de OneSkin CRM.",
        searchPlaceholder: "Buscar en la documentación...",
        print: "Imprimir Sección",
        tabs: {
            userManual: "Manual de Usuario",
            faq: "Preguntas Frecuentes",
            tutorials: "Tutoriales",
            technicalGuide: "Guía Técnica",
            shortcuts: "Atajos de Teclado",
        }
    },
    userManual: {
        navigation: "Módulos",
        dashboard: {
            title: "Guía del Dashboard",
            content: `
El **Dashboard** es tu centro de control principal. Proporciona una vista general en tiempo real de las métricas clave de tu negocio.

*   **Tarjetas de KPIs**: En la parte superior, encontrarás indicadores clave de rendimiento como Leads Totales, Tasa de Conversión, Ingresos y Clientes Activos.
*   **Embudo de Oportunidades**: Una representación visual de tu pipeline de ventas, mostrando cuántas oportunidades hay en cada etapa.
*   **Fuentes de Leads**: Un gráfico circular que desglosa de dónde provienen tus leads.
*   **Leads Principales**: Una lista de tus 5 leads con mayor puntuación que requieren atención inmediata.
*   **Filtro de Rango de Fechas**: Todos los datos del dashboard se pueden filtrar por períodos de tiempo específicos.

`
        },
        leads: {
            title: "Gestión de Leads",
            content: "Un **Lead** es un contacto de venta potencial: un individuo u organización que expresa interés en tus bienes o servicios. El objetivo es cualificarlos y convertirlos en clientes."
        },
        customers: {
            title: "Gestión de Clientes",
            content: "Un **Cliente** es un individuo o empresa que ha comprado bienes o servicios de tu compañía. Este módulo te ayuda a seguir su estado, salud e historial."
        },
        deals: {
            title: "Pipeline de Oportunidades",
            content: "El módulo de **Oportunidades** (Deals) sigue las oportunidades que generan ingresos a través de tu pipeline de ventas. Cada oportunidad está asociada a un cliente y tiene un valor monetario y una fecha de cierre proyectada."
        },
        products: {
            title: "Catálogo de Productos",
            content: "Gestiona las ofertas de productos y servicios de tu empresa. Los productos se pueden organizar en categorías y subcategorías jerárquicas."
        },
        reports: {
            title: "Reportes Programados",
            content: "Automatiza tus informes. Puedes programar reportes sobre leads, oportunidades o ingresos para que se envíen a destinatarios específicos con una frecuencia diaria, semanal o mensual."
        },
        webhooks: {
            title: "Webhooks",
            content: "Usa **Webhooks** para enviar datos en tiempo real desde el CRM a aplicaciones externas cada vez que ocurran eventos específicos, como la creación de un nuevo lead."
        },
        integrations: {
            title: "Centro de Integraciones",
            content: "Conecta OneSkin CRM con otros servicios populares como Slack, Mailchimp y Zapier para optimizar tus flujos de trabajo."
        },
        alerts: {
            title: "Alertas Predictivas",
            content: "El sistema de **Alertas** analiza proactivamente tus datos para identificar eventos de negocio importantes que requieren tu atención, como leads con alta probabilidad de conversión ('Hot Leads') o clientes en riesgo de abandono ('Riesgo de Fuga')."
        }
    },
    faq: {
        general: {
            title: "Preguntas Generales",
            items: [
                { q: "¿Cómo filtro y exporto datos?", a: "En módulos como Leads y Clientes, usa la barra de búsqueda superior para filtrar. El botón 'Exportar CSV' descargará la vista actual como un archivo CSV." },
                { q: "¿Cómo personalizo el tema?", a: "Navega a la página 'Tema' desde el menú lateral. Puedes seleccionar un preajuste o crear tu propio esquema de colores usando el personalizador." }
            ]
        },
        leads: {
            title: "Leads",
            items: [
                { q: "¿Qué significa el 'Lead Score'?", a: "El Lead Score es un número de 0 a 100 que representa la preparación para la venta de un lead. Se calcula en base a factores como su origen, empresa y engagement. Una puntuación más alta significa un mejor lead." }
            ]
        },
        customers: {
            title: "Clientes",
            items: [
                { q: "¿Qué es el 'Health Score'?", a: "El Health Score indica la probabilidad de que un cliente se mantenga activo y leal. Se basa en su actividad, historial de compras y fecha del último contacto. Una puntuación baja puede indicar un riesgo de fuga." }
            ]
        },
        deals: {
            title: "Oportunidades",
            items: [
                { q: "¿Cómo se calcula la probabilidad de una Oportunidad?", a: "La probabilidad es un porcentaje estimado de cuán probable es que la oportunidad se gane. A menudo está ligada a la etapa actual de la oportunidad en el pipeline." }
            ]
        },
        integrations: {
            title: "Integraciones",
            items: [
                { q: "¿Cómo configuro un Webhook?", a: "Ve al módulo de Webhooks, haz clic en 'Crear Webhook' y proporciona la URL de tu servicio externo. Luego, selecciona los eventos (ej. 'lead.created') que deben disparar el webhook." }
            ]
        }
    },
    tutorials: {
        createLead: {
            title: "Tu Primer Lead",
            description: "Sigue estos pasos para añadir un nuevo cliente potencial a tu CRM.",
            steps: [
                "Navega al módulo **Leads** desde el menú lateral.",
                "Haz clic en el botón **Nuevo Lead** en la esquina superior derecha.",
                "Rellena los campos requeridos como `Nombre` y `Email` en el modal que aparece.",
                "Selecciona una `Fuente` y un `Estado` inicial.",
                "Haz clic en **Guardar Lead**. El sistema calculará automáticamente una puntuación inicial para el lead."
            ]
        },
        manageDeal: {
            title: "Gestionando una Oportunidad",
            description: "Aprende cómo mover una oportunidad a través de tu pipeline de ventas de principio a fin.",
            steps: [
                "Ve al módulo de **Oportunidades** (Deals).",
                "Haz clic en **Nueva Oportunidad** y asóciala a un cliente existente.",
                "Define el `Valor` y la `Fecha de Cierre Prevista`.",
                "A medida que avances, edita la oportunidad y actualiza su `Etapa` (ej., de 'Cualificación' a 'Propuesta').",
                "Una vez se conozca el resultado, establece la etapa a `Cerrada Ganada` o `Cerrada Perdida`."
            ]
        },
        setupReport: {
            title: "Programando un Reporte",
            description: "Automatiza tus informes para mantener a tu equipo informado.",
            steps: [
                "Navega al módulo de **Reportes**.",
                "Haz clic en **Nuevo Reporte**.",
                "Dale al reporte un nombre descriptivo, como 'Pipeline de Ventas Semanal'.",
                "Elige el `Tipo de Reporte` (ej. Oportunidades), `Frecuencia` (ej. Semanal), y `Formato` (ej. PDF).",
                "Introduce las direcciones de email de los destinatarios, separadas por comas.",
                "Haz clic en **Guardar Reporte**. El reporte se enviará ahora automáticamente según tu programación."
            ]
        },
        createWebhook: {
            title: "Creando un Webhook",
            description: "Envía actualizaciones en tiempo real a otras aplicaciones.",
            steps: [
                "Ve a la página de **Webhooks**.",
                "Haz clic en **Crear Webhook**.",
                "Introduce la `URL del Endpoint` proporcionada por la aplicación externa (ej. Zapier).",
                "Selecciona los `Eventos` que deben disparar este webhook, por ejemplo, `lead.created`.",
                "Haz clic en **Guardar**. Ahora, cada vez que se cree un nuevo lead, el CRM enviará una petición POST con los datos del lead a tu URL."
            ]
        }
    },
    technicalGuide: {
        architecture: {
            title: "Arquitectura del Sistema",
            description: "OneSkin CRM es una aplicación web moderna construida con React, TypeScript y Tailwind CSS. El backend está impulsado por Supabase, que proporciona una base de datos PostgreSQL, autenticación y almacenamiento."
        },
        databaseSchema: {
            title: "Esquema de la Base de Datos (SQL)",
            description: "El siguiente script SQL puede ser usado para crear todas las tablas y relaciones necesarias en tu proyecto de Supabase. **Es seguro volver a ejecutar este script en cualquier momento.** Creará las tablas si no existen y añadirá las columnas que falten (como `segment`, `parent_id`, `active`, `sku`) para soportar actualizaciones desde versiones antiguas sin perder datos.",
            sql: `
-- Create Users Table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('Admin', 'Commercial'))
);

-- Create Countries Table
CREATE TABLE IF NOT EXISTS countries (
  code VARCHAR(2) PRIMARY KEY,
  name VARCHAR(255) NOT NULL
);

-- Create Product Categories Table (Hierarchical)
CREATE TABLE IF NOT EXISTS product_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT
);
-- Add parent_id column if it doesn't exist.
ALTER TABLE product_categories ADD COLUMN IF NOT EXISTS parent_id INT REFERENCES product_categories(id) ON DELETE SET NULL;


-- Create Products Table
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL,
  category_id INT REFERENCES product_categories(id) ON DELETE SET NULL
);
-- Add active and sku columns if they don't exist.
ALTER TABLE products ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sku VARCHAR(255) NOT NULL DEFAULT 'SKU_PENDING';


-- Create Leads Table
CREATE TABLE IF NOT EXISTS leads (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  name VARCHAR(255) NOT NULL,
  company VARCHAR(255),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50),
  country VARCHAR(255),
  status VARCHAR(50) NOT NULL,
  source VARCHAR(50) NOT NULL,
  score INT DEFAULT 0,
  notes TEXT
);
-- Add segment column if it doesn't exist.
ALTER TABLE leads ADD COLUMN IF NOT EXISTS segment VARCHAR(50);


-- Create Customers Table
CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  name VARCHAR(255) NOT NULL,
  company VARCHAR(255),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50),
  country VARCHAR(255),
  status VARCHAR(50) NOT NULL,
  health_score INT DEFAULT 75,
  last_contact TIMESTAMPTZ
);
-- Add segment column if it doesn't exist.
ALTER TABLE customers ADD COLUMN IF NOT EXISTS segment VARCHAR(50);


-- Create Deals Table
CREATE TABLE IF NOT EXISTS deals (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  title VARCHAR(255) NOT NULL,
  customer_id INT REFERENCES customers(id) ON DELETE SET NULL,
  value NUMERIC(12, 2) NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL,
  probability INT,
  expected_close_date DATE,
  notes TEXT
);

-- Create Scheduled Reports Table
CREATE TABLE IF NOT EXISTS scheduled_reports (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  name VARCHAR(255) NOT NULL,
  report_type VARCHAR(50),
  frequency VARCHAR(50) NOT NULL,
  recipients TEXT[] NOT NULL,
  format VARCHAR(20),
  last_run TIMESTAMPTZ,
  next_run TIMESTAMPTZ
);

-- Create Webhooks Table
CREATE TABLE IF NOT EXISTS webhooks (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  name VARCHAR(255),
  url VARCHAR(2048) NOT NULL,
  events TEXT[] NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  last_triggered TIMESTAMPTZ
);

-- Create Integrations Table
CREATE TABLE IF NOT EXISTS connected_integrations (
  id TEXT PRIMARY KEY
);
`
        },
        apiReference: {
            title: "Referencia de la API de Servicios",
            description: "Vista general de las principales funciones disponibles en los servicios del frontend."
        },
        webhooks: {
            title: "Payloads de Webhooks",
            description: "Cuando un evento dispara un webhook, el CRM envía una petición POST con un payload JSON. Aquí tienes algunos ejemplos."
        }
    },
    keyboardShortcuts: {
        general: {
            title: "Atajos Generales",
            shortcuts: [
                { keys: "Esc", action: "Cerrar cualquier modal o diálogo abierto." },
                { keys: "Ctrl + F", action: "Activar la barra de búsqueda principal en una vista de lista." }
            ]
        },
        navigation: {
            title: "Navegación",
            shortcuts: [
                { keys: "Alt + D", action: "Ir al Dashboard" },
                { keys: "Alt + L", action: "Ir a Leads" },
                { keys: "Alt + C", action: "Ir a Clientes" }
            ]
        },
        actions: {
            title: "Acciones",
            shortcuts: [
                { keys: "Ctrl + N", action: "Abrir el modal 'Nuevo Elemento' (ej. Nuevo Lead)." },
                { keys: "Ctrl + S", action: "Guardar el formulario en el modal abierto." }
            ]
        }
    }
  },
  pt: {
    documentation: {
        title: "Ajuda e Documentação",
        description: "Encontre guias, tutoriais e informações técnicas para aproveitar ao máximo o OneSkin CRM.",
        searchPlaceholder: "Pesquisar na documentação...",
        print: "Imprimir Seção",
        tabs: {
            userManual: "Manual do Usuário",
            faq: "Perguntas Frequentes",
            tutorials: "Tutoriais",
            technicalGuide: "Guia Técnico",
            shortcuts: "Atalhos de Teclado",
        }
    },
    userManual: {
        navigation: "Módulos",
        dashboard: {
            title: "Guia do Painel de Controle",
            content: `
O **Painel de Controle** (Dashboard) é o seu principal centro de comando. Ele fornece una visão geral em tempo real das principais métricas de negócios.

*   **Cartões de KPIs**: No topo, você encontrará indicadores-chave de desempenho como Leads Totais, Taxa de Conversão, Receita e Clientes Ativos.
*   **Funil de Negócios**: Uma representação visual do seu pipeline de vendas, mostrando quantos negócios estão em cada estágio.
*   **Fontes de Leads**: Um gráfico de pizza detalhando a origem dos seus leads.
*   **Leads Principais**: Uma lista dos seus 5 leads com maior pontuação que requerem atenção imediata.
*   **Filtro de Período**: Todos os dados do painel podem ser filtrados por períodos de tempo específicos.

`
        },
        leads: {
            title: "Gerenciamento de Leads",
            content: "Um **Lead** é um contato de venda em potencial — um indivíduo ou organização que expressa interesse em seus produtos ou serviços. O objetivo é qualificá-los e convertê-los em clientes."
        },
        customers: {
            title: "Gerenciamento de Clientes",
            content: "Um **Cliente** é um indivíduo ou empresa que comprou produtos ou serviços da sua empresa. Este módulo ajuda a rastrear seu status, saúde e histórico."
        },
        deals: {
            title: "Pipeline de Negócios",
            content: "O módulo de **Negócios** (Deals) acompanha as oportunidades de geração de receita através do seu pipeline de vendas. Cada negócio está associado a um cliente e tem um valor monetário e uma data de fechamento projetada."
        },
        products: {
            title: "Catálogo de Produtos",
            content: "Gerencie as ofertas de produtos e serviços da sua empresa. Os produtos podem ser organizados em categorias e subcategorias hierárquicas."
        },
        reports: {
            title: "Relatórios Agendados",
            content: "Automatize seus relatórios. Você pode agendar relatórios sobre leads, negócios ou receita para serem enviados a destinatários específicos com frequência diária, semanal ou mensal."
        },
        webhooks: {
            title: "Webhooks",
            content: "Use **Webhooks** para enviar dados em tempo real do CRM para aplicativos externos sempre que eventos específicos ocorrerem, como a criação de um novo lead."
        },
        integrations: {
            title: "Central de Integrações",
            content: "Conecte o OneSkin CRM a outros serviços populares como Slack, Mailchimp e Zapier para otimizar seus fluxos de trabalho."
        },
        alerts: {
            title: "Alertas Preditivos",
            content: "O sistema de **Alertas** analisa proativamente seus dados para identificar eventos de negócios importantes que exigem sua atenção, como leads com alta probabilidade de conversão ('Leads Quentes') ou clientes em risco de cancelamento ('Risco de Churn')."
        }
    },
    faq: {
        general: {
            title: "Perguntas Gerais",
            items: [
                { q: "Como eu filtro e exporto dados?", a: "Em módulos como Leads e Clientes, use a barra de pesquisa no topo para filtrar. O botão 'Exportar CSV' fará o download da visualização atual como um arquivo CSV." },
                { q: "Como eu personalizo o tema?", a: "Navegue para a página 'Tema' no menu lateral. Você pode selecionar uma predefinição ou criar seu próprio esquema de cores usando o personalizador." }
            ]
        },
        leads: {
            title: "Leads",
            items: [
                { q: "O que significa 'Pontuação do Lead'?", a: "A Pontuação do Lead é um número de 0 a 100 que representa a prontidão de um lead para a venda. É calculada com base em fatores como sua origem, empresa e engajamento. Uma pontuação mais alta significa um lead melhor." }
            ]
        },
        customers: {
            title: "Clientes",
            items: [
                { q: "O que é 'Pontuação de Saúde'?", a: "A Pontuação de Saúde indica a probabilidade de um cliente permanecer ativo e leal. É baseada em sua atividade, histórico de compras e data do último contato. Uma pontuação baixa pode indicar risco de churn." }
            ]
        },
        deals: {
            title: "Negócios",
            items: [
                { q: "Como a probabilidade de um Negócio é calculada?", a: "A probabilidade é uma porcentagem estimada da chance de o negócio ser ganho. Geralmente está atrelada ao estágio atual do negócio no pipeline." }
            ]
        },
        integrations: {
            title: "Integrações",
            items: [
                { q: "Como configuro um Webhook?", a: "Vá para o módulo de Webhooks, clique em 'Criar Webhook' e forneça a URL do seu serviço externo. Em seguida, selecione os eventos (ex: 'lead.created') que devem acionar o webhook." }
            ]
        }
    },
    tutorials: {
        createLead: {
            title: "Seu Primeiro Lead",
            description: "Siga estes passos para adicionar um novo cliente em potencial ao seu CRM.",
            steps: [
                "Navegue para o módulo **Leads** no menu lateral.",
                "Clique no botão **Novo Lead** no canto superior direito.",
                "Preencha os campos obrigatórios como `Nome` e `Email` no modal que aparece.",
                "Selecione una `Fonte` e um `Status` inicial.",
                "Clique em **Salvar Lead**. O sistema calculará automaticamente uma pontuação inicial para o lead."
            ]
        },
        manageDeal: {
            title: "Gerenciando um Negócio",
            description: "Aprenda como mover um negócio pelo seu pipeline de vendas do início ao fim.",
            steps: [
                "Vá para o módulo de **Negócios** (Deals).",
                "Clique em **Novo Negócio** e associe-o a um cliente existente.",
                "Defina o `Valor` e a `Data de Fechamento Esperada`.",
                "Conforme progride, edite o negócio e atualize seu `Estágio` (ex., de 'Qualificação' para 'Proposta').",
                "Quando o resultado for conhecido, defina o estágio para `Fechado Ganho` ou `Fechado Perdido`."
            ]
        },
        setupReport: {
            title: "Agendando um Relatório",
            description: "Automatize seus relatórios para manter sua equipe informada.",
            steps: [
                "Navegue para o módulo de **Relatórios**.",
                "Clique em **Novo Relatório**.",
                "Dê um nome descritivo ao relatório, como 'Pipeline de Vendas Semanal'.",
                "Escolha o `Tipo de Relatório` (ex. Negócios), `Frequência` (ex. Semanal) e `Formato` (ex. PDF).",
                "Insira os endereços de e-mail dos destinatários, separados por vírgulas.",
                "Clique em **Salvar Relatório**. O relatório agora será enviado automaticamente de acordo com sua programação."
            ]
        },
        createWebhook: {
            title: "Criando um Webhook",
            description: "Envie atualizações em tempo real para outras aplicações.",
            steps: [
                "Vá para a página de **Webhooks**.",
                "Clique em **Criar Webhook**.",
                "Insira a `URL do Endpoint` fornecida pela aplicação externa (ex. Zapier).",
                "Selecione os `Eventos` que devem acionar este webhook, por exemplo, `lead.created`.",
                "Clique em **Salvar**. Agora, toda vez que um novo lead for criado, o CRM enviará uma requisição POST com os dados do lead para sua URL."
            ]
        }
    },
    technicalGuide: {
        architecture: {
            title: "Arquitetura do Sistema",
            description: "O OneSkin CRM é uma aplicação web moderna construída com React, TypeScript e Tailwind CSS. O backend é alimentado pelo Supabase, que fornece um banco de dados PostgreSQL, autenticação e armazenamento."
        },
        databaseSchema: {
            title: "Esquema do Banco de Dados (SQL)",
            description: "O script SQL a seguir pode ser usado para criar todas as tabelas e relacionamentos necessários em seu projeto Supabase. **É seguro executar este script novamente a qualquer momento.** Ele criará tabelas se não existirem e adicionará colunas ausentes (como `segment`, `parent_id`, `active`, `sku`) para suportar atualizações de versões mais antigas sem perda de dados.",
            sql: `
-- Create Users Table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('Admin', 'Commercial'))
);

-- Create Countries Table
CREATE TABLE IF NOT EXISTS countries (
  code VARCHAR(2) PRIMARY KEY,
  name VARCHAR(255) NOT NULL
);

-- Create Product Categories Table (Hierarchical)
CREATE TABLE IF NOT EXISTS product_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT
);
-- Add parent_id column if it doesn't exist.
ALTER TABLE product_categories ADD COLUMN IF NOT EXISTS parent_id INT REFERENCES product_categories(id) ON DELETE SET NULL;


-- Create Products Table
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL,
  category_id INT REFERENCES product_categories(id) ON DELETE SET NULL
);
-- Add active and sku columns if they don't exist.
ALTER TABLE products ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sku VARCHAR(255) NOT NULL DEFAULT 'SKU_PENDING';


-- Create Leads Table
CREATE TABLE IF NOT EXISTS leads (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  name VARCHAR(255) NOT NULL,
  company VARCHAR(255),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50),
  country VARCHAR(255),
  status VARCHAR(50) NOT NULL,
  source VARCHAR(50) NOT NULL,
  score INT DEFAULT 0,
  notes TEXT
);
-- Add segment column if it doesn't exist.
ALTER TABLE leads ADD COLUMN IF NOT EXISTS segment VARCHAR(50);


-- Create Customers Table
CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  name VARCHAR(255) NOT NULL,
  company VARCHAR(255),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50),
  country VARCHAR(255),
  status VARCHAR(50) NOT NULL,
  health_score INT DEFAULT 75,
  last_contact TIMESTAMPTZ
);
-- Add segment column if it doesn't exist.
ALTER TABLE customers ADD COLUMN IF NOT EXISTS segment VARCHAR(50);

-- Create Deals Table
CREATE TABLE IF NOT EXISTS deals (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  title VARCHAR(255) NOT NULL,
  customer_id INT REFERENCES customers(id) ON DELETE SET NULL,
  value NUMERIC(12, 2) NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL,
  probability INT,
  expected_close_date DATE,
  notes TEXT
);

-- Create Scheduled Reports Table
CREATE TABLE IF NOT EXISTS scheduled_reports (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  name VARCHAR(255) NOT NULL,
  report_type VARCHAR(50),
  frequency VARCHAR(50) NOT NULL,
  recipients TEXT[] NOT NULL,
  format VARCHAR(20),
  last_run TIMESTAMPTZ,
  next_run TIMESTAMPTZ
);

-- Create Webhooks Table
CREATE TABLE IF NOT EXISTS webhooks (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  name VARCHAR(255),
  url VARCHAR(2048) NOT NULL,
  events TEXT[] NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  last_triggered TIMESTAMPTZ
);

-- Create Integrations Table
CREATE TABLE IF NOT EXISTS connected_integrations (
  id TEXT PRIMARY KEY
);
`
        },
        apiReference: {
            title: "Referência da API de Serviços",
            description: "Visão geral das principais funções disponíveis nos serviços do frontend."
        },
        webhooks: {
            title: "Payloads de Webhooks",
            description: "Quando um evento aciona um webhook, o CRM envia uma requisição POST com um payload JSON. Aqui estão alguns exemplos."
        }
    },
    keyboardShortcuts: {
        general: {
            title: "Atalhos Gerais",
            shortcuts: [
                { keys: "Esc", action: "Fechar qualquer modal ou diálogo aberto." },
                { keys: "Ctrl + F", action: "Focar na barra de pesquisa principal em uma visualização de lista." }
            ]
        },
        navigation: {
            title: "Navegação",
            shortcuts: [
                { keys: "Alt + D", action: "Ir para o Painel de Controle" },
                { keys: "Alt + L", action: "Ir para Leads" },
                { keys: "Alt + C", action: "Ir para Clientes" }
            ]
        },
        actions: {
            title: "Ações",
            shortcuts: [
                { keys: "Ctrl + N", action: "Abrir o modal 'Novo Item' (ex. Novo Lead)." },
                { keys: "Ctrl + S", action: "Salvar o formulário no modal atualmente aberto." }
            ]
        }
    }
  }
};