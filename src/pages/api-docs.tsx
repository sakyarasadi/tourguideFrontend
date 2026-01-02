import dynamic from 'next/dynamic';
import 'swagger-ui-react/swagger-ui.css';

const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false });

export default function ApiDocs() {
  return (
    <>
      <style jsx global>{`
        /* Light theme overrides for Swagger UI */
        .swagger-ui {
          background: #ffffff;
        }
        
        .swagger-ui .topbar {
          background-color: #89bf04;
        }
        
        .swagger-ui .info {
          background: #ffffff;
          color: #3b4151;
        }
        
        .swagger-ui .info .title {
          color: #3b4151;
        }
        
        .swagger-ui .scheme-container {
          background: #ffffff;
        }
        
        .swagger-ui .opblock.opblock-get {
          background: #e7f3ff;
          border-color: #61affe;
        }
        
        .swagger-ui .opblock.opblock-post {
          background: #e8f5e9;
          border-color: #49cc90;
        }
        
        .swagger-ui .opblock.opblock-put {
          background: #fff3e0;
          border-color: #fca130;
        }
        
        .swagger-ui .opblock.opblock-delete {
          background: #ffebee;
          border-color: #f93e3e;
        }
        
        .swagger-ui .opblock .opblock-summary {
          background: transparent;
        }
        
        .swagger-ui .opblock .opblock-summary-method {
          background: #3b4151;
        }
        
        .swagger-ui .opblock.opblock-get .opblock-summary-method {
          background: #61affe;
        }
        
        .swagger-ui .opblock.opblock-post .opblock-summary-method {
          background: #49cc90;
        }
        
        .swagger-ui .opblock.opblock-put .opblock-summary-method {
          background: #fca130;
        }
        
        .swagger-ui .opblock.opblock-delete .opblock-summary-method {
          background: #f93e3e;
        }
        
        .swagger-ui .opblock-body {
          background: #ffffff;
        }
        
        .swagger-ui .opblock-body pre {
          background: #f7f7f7;
          color: #3b4151;
        }
        
        .swagger-ui .parameter__name {
          color: #3b4151;
        }
        
        .swagger-ui .response-col_status {
          color: #3b4151;
        }
        
        .swagger-ui .response-col_description {
          color: #3b4151;
        }
        
        .swagger-ui .btn {
          background: #89bf04;
          color: #ffffff;
        }
        
        .swagger-ui .btn:hover {
          background: #6a9a03;
        }
        
        .swagger-ui .btn.cancel {
          background: #f7f7f7;
          color: #3b4151;
        }
        
        .swagger-ui .btn.cancel:hover {
          background: #e0e0e0;
        }
        
        .swagger-ui input[type=text],
        .swagger-ui input[type=email],
        .swagger-ui input[type=password],
        .swagger-ui textarea,
        .swagger-ui select {
          background: #ffffff;
          border: 1px solid #d0d0d0;
          color: #3b4151;
        }
        
        .swagger-ui .model-title {
          color: #3b4151;
        }
        
        .swagger-ui .prop-name {
          color: #3b4151;
        }
        
        .swagger-ui .prop-type {
          color: #3b4151;
        }
        
        .swagger-ui table thead tr th {
          background: #f7f7f7;
          color: #3b4151;
        }
        
        .swagger-ui table tbody tr td {
          color: #3b4151;
        }
        
        .swagger-ui .response-col_links {
          color: #3b4151;
        }
        
        .swagger-ui .tab li {
          background: #f7f7f7;
          color: #3b4151;
        }
        
        .swagger-ui .tab li.active {
          background: #ffffff;
          color: #3b4151;
        }
        
        .swagger-ui .model-box {
          background: #ffffff;
        }
        
        .swagger-ui .model {
          background: #ffffff;
        }
        
        .swagger-ui .model-toggle {
          background: #f7f7f7;
        }
        
        .swagger-ui .model-toggle:hover {
          background: #e0e0e0;
        }
        
        body {
          background: #ffffff !important;
        }
      `}</style>
      <div style={{ height: '100vh', background: '#ffffff' }}>
        <SwaggerUI url="/swagger.yaml" docExpansion="none" />
      </div>
    </>
  );
}


