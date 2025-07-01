# IPTV App

Aplicativo para streaming de TV ao vivo, filmes e séries usando serviço IPTV.

## Configuração

1. Clone o repositório
2. Instale as dependências:
   ```bash
   npm install --legacy-peer-deps
   ```
3. Configure as variáveis de ambiente:
   - Crie um arquivo `.env` na raiz do projeto
   - Adicione suas credenciais do serviço IPTV:
     ```
     REACT_APP_IPTV_USERNAME=seu_usuario
     REACT_APP_IPTV_PASSWORD=sua_senha
     ```

## Desenvolvimento

Para iniciar o servidor de desenvolvimento:

```bash
npm start
```

O aplicativo estará disponível em [http://localhost:3000](http://localhost:3000)

## Funcionalidades

- TV ao Vivo com player de streaming
  - Lista de canais ao vivo
  - Player de vídeo integrado
  - Seleção de canais dinâmica

- Catálogo de Filmes
  - Visualização em grid
  - Informações detalhadas
  - Player integrado

- Catálogo de Séries
  - Organização por temporadas
  - Lista de episódios
  - Continuação automática

- Interface
  - Design responsivo
  - Tema escuro
  - Navegação intuitiva

## Tecnologias Utilizadas

- React 18
- TypeScript
- Material UI v5
- React Router v6
- Axios para requisições HTTP
- React Player para streaming

## Estrutura do Projeto

```
src/
  ├── components/     # Componentes reutilizáveis
  ├── pages/          # Páginas da aplicação
  ├── services/       # Serviços e integrações
  └── theme/          # Configuração de tema
```

## Notas de Desenvolvimento

- Utilize `--legacy-peer-deps` ao instalar novas dependências para evitar conflitos
- Mantenha as credenciais IPTV seguras no arquivo `.env`
- Siga os padrões de código TypeScript
