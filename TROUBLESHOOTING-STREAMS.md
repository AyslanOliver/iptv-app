# Guia de Solução de Problemas - URLs de Stream Inválidas

## Problema: "URL do stream inválida. Verifique a configuração do canal."

### Possíveis Causas e Soluções

#### 1. **Credenciais Inválidas**
- **Sintoma**: Erro ao selecionar qualquer canal
- **Verificação**: Abra o console do navegador (F12) e procure por mensagens como:
  ```
  ❌ Credenciais inválidas: { username: false, password: false }
  ```
- **Solução**: 
  - Faça logout e login novamente
  - Verifique se username e password estão corretos

#### 2. **Dados do Usuário Corrompidos**
- **Sintoma**: Erro "Dados do usuário não encontrados no localStorage"
- **Verificação**: Console mostra:
  ```
  ❌ Dados do usuário não encontrados no localStorage
  ```
- **Solução**:
  - Limpe o localStorage: `localStorage.clear()`
  - Faça login novamente

#### 3. **Canal sem stream_id**
- **Sintoma**: Alguns canais específicos não funcionam
- **Verificação**: Console mostra:
  ```
  ❌ Canal inválido ou sem stream_id: { name: "Canal X", stream_id: null }
  ```
- **Solução**: Este é um problema dos dados do canal, não há solução do lado cliente

#### 4. **Problema de Proxy**
- **Sintoma**: URLs são geradas corretamente mas o vídeo não carrega
- **Verificação**: Console mostra URLs como:
  ```
  🎯 URL do stream gerada: /stream/live/username/password/12345.m3u8
  ```
- **Solução**:
  - Verifique se o servidor está rodando
  - Confirme se o proxy está configurado corretamente
  - Teste a URL diretamente no navegador

#### 5. **Servidor IPTV Indisponível**
- **Sintoma**: URLs corretas mas erro 404 ou timeout
- **Verificação**: Teste manual da URL: `http://zeusodin.online/live/username/password/stream_id.m3u8`
- **Solução**: Aguardar o servidor voltar ou contatar o provedor IPTV

### Como Debuggar

#### 1. **Abrir Console do Navegador**
- Pressione F12
- Vá para a aba "Console"
- Selecione um canal e observe as mensagens

#### 2. **Logs Importantes**
```javascript
// Seleção de canal bem-sucedida
🔄 Selecionando canal: { name: "Canal", stream_id: "12345", username: "user" }
🎯 URL do stream gerada: /stream/live/user/pass/12345.m3u8

// Problemas comuns
❌ Canal inválido ou sem stream_id
❌ Dados do usuário não encontrados no localStorage
❌ Credenciais inválidas
❌ Erro ao processar dados do usuário
```

#### 3. **Testar URLs Manualmente**
- Copie a URL gerada do console
- Cole no navegador: `http://localhost:3000/stream/live/username/password/stream_id.m3u8`
- Se retornar erro 404, o problema é no servidor IPTV
- Se retornar dados, o problema é no player

### Estrutura de URLs

#### URLs Corretas:
- **Live TV**: `/stream/live/{username}/{password}/{stream_id}.m3u8`
- **Catchup**: `/stream/timeshift/{username}/{password}/{stream_id}.m3u8?utc={start}&duration={minutes}`
- **Movies**: `/stream/movie/{username}/{password}/{stream_id}.{extension}`
- **Series**: `/stream/series/{username}/{password}/{stream_id}.{extension}`

#### Proxy Configuration:
- Todas as URLs `/stream/*` são redirecionadas para `http://zeusodin.online/*`
- Exemplo: `/stream/live/user/pass/123.m3u8` → `http://zeusodin.online/live/user/pass/123.m3u8`

### Soluções Rápidas

1. **Limpar Cache e Dados**:
   ```javascript
   localStorage.clear();
   sessionStorage.clear();
   location.reload();
   ```

2. **Verificar Credenciais**:
   ```javascript
   const userData = localStorage.getItem('iptvUser');
   console.log('Dados salvos:', JSON.parse(userData));
   ```

3. **Testar Conectividade**:
   - Acesse: `http://localhost:3000/api/player_api.php?username=SEU_USER&password=SEU_PASS&action=get_live_streams`
   - Deve retornar lista de canais em JSON

### Contato para Suporte

Se o problema persistir após seguir este guia:
1. Anote as mensagens do console
2. Informe qual canal está tentando assistir
3. Confirme se as credenciais estão corretas
4. Teste em outro navegador/dispositivo