# Guia de Funcionalidades EPG e Catchup

## Funcionalidades Implementadas

### 1. EPG (Electronic Program Guide)
- **Busca automática de dados EPG** do servidor zed7.top
- **Exibição de programação atual e próxima** para cada canal
- **Horários formatados** em português brasileiro
- **Carregamento assíncrono** com indicador visual

### 2. Catchup TV
- **Botão de catchup** (⏮️) para assistir programas desde o início
- **Geração automática de URLs** de catchup com parâmetros corretos
- **Integração com o player** existente

## Como Funciona

### Configuração do Proxy
O arquivo `setupProxy.js` foi configurado com um proxy para EPG:
```javascript
// Proxy para EPG XMLTV
app.use('/epg', createProxyMiddleware({
  target: 'http://zed7.top',
  changeOrigin: true,
  pathRewrite: { '^/epg': '/xmltv.php' }
}));
```

### Funções Principais

#### `getEpgData(credentials)`
- Busca dados EPG via proxy local
- Faz parse do XML XMLTV
- Retorna objeto com programação por canal

#### `generateCatchupUrl(credentials, channelId, utcStart, duration)`
- Gera URL de catchup usando proxy local
- Formato: `/stream/timeshift/{user}/{pass}/{channel}.m3u8?utc={start}&duration={minutes}`

#### `formatToXmltvUtc(timestamp)`
- Converte timestamp para formato XMLTV UTC
- Formato: YYYYMMDDHHMMSS

### Interface do Usuário

#### Informações EPG nos Canais
- **Programa atual**: Horário e título
- **Botão catchup**: ⏮️ para assistir desde o início
- **Indicador de carregamento**: "Carregando EPG..."
- **Fallback**: "Programação não disponível" quando não há dados

#### Uso do Catchup
1. Clique no botão ⏮️ ao lado do programa atual
2. O player carregará o programa desde o início
3. Console mostrará logs detalhados da operação

## Logs e Debug

### Console Logs
- 🔍 **Busca EPG**: Mostra URL e status
- 📄 **Dados recebidos**: Tamanho do XML
- ✅ **Parse concluído**: Número de canais processados
- 🎬 **Catchup iniciado**: Detalhes do programa
- ❌ **Erros**: Problemas de rede ou parsing

### Verificação de Funcionamento
1. Abra o console do navegador (F12)
2. Navegue para Live TV
3. Observe os logs de carregamento EPG
4. Teste o botão catchup em um programa atual

## Credenciais
As funcionalidades usam as credenciais salvas no localStorage:
- **Username**: Obtido do login do usuário
- **Password**: Obtido do login do usuário
- **Servidor EPG**: zed7.top (via proxy)
- **Servidor Streams**: zeusodin.online (via proxy)

## Estrutura de Dados EPG
```javascript
{
  "channelId": [
    {
      channel: "channelId",
      start: "20231201120000 +0000",
      stop: "20231201130000 +0000",
      title: "Nome do Programa",
      description: "Descrição do programa",
      startTime: 1701432000, // timestamp
      stopTime: 1701435600   // timestamp
    }
  ]
}
```

## Troubleshooting

### EPG não carrega
1. Verificar se o proxy está funcionando
2. Verificar credenciais no localStorage
3. Verificar logs de erro no console
4. Testar URL manualmente: `http://localhost:3000/epg?username=X&password=Y`

### Catchup não funciona
1. Verificar se há programa atual disponível
2. Verificar logs de geração de URL
3. Verificar se o player aceita a nova URL
4. Testar URL de catchup manualmente

### Performance
- EPG é carregado uma vez por sessão
- Dados são mantidos em estado React
- Parsing XML é otimizado para performance
- Proxy reduz latência e resolve CORS

## Próximos Passos
1. **Cache de EPG**: Implementar cache local com TTL
2. **EPG estendido**: Mostrar programação de vários dias
3. **Gravação**: Implementar agendamento de gravações
4. **Busca de programas**: Buscar por título/descrição
5. **Notificações**: Alertas para programas favoritos