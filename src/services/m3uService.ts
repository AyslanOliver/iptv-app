import axios from 'axios';

export interface M3UChannel {
  id: string;
  name: string;
  url: string;
  logo?: string;
  group?: string;
}

export async function parseM3U(url: string): Promise<M3UChannel[]> {
  try {
    const response = await axios.get<string>(url, {
      headers: {
        'Accept': '*/*',
        'Cache-Control': 'no-cache'
      },
      timeout: 10000, // 10 segundos
      validateStatus: (status) => status === 200
    });
    const content = response.data;
    const channels: M3UChannel[] = [];
    
    const lines = content.split('\n');
    let currentChannel: Partial<M3UChannel> = {};
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.startsWith('#EXTINF:')) {
        // Parse channel info
        const infoLine = line.substring(8);
        const titleMatch = infoLine.match(/,(.+)$/);
        const logoMatch = infoLine.match(/tvg-logo="([^"]+)"/);
        const groupMatch = infoLine.match(/group-title="([^"]+)"/);
        
        currentChannel = {
          id: String(channels.length + 1),
          name: titleMatch ? titleMatch[1].trim() : `Canal ${channels.length + 1}`,
          logo: logoMatch ? logoMatch[1] : undefined,
          group: groupMatch ? groupMatch[1] : undefined
        };
      } else if (line.startsWith('http')) {
        // Channel URL
        if (currentChannel.name) {
          channels.push({
            ...currentChannel,
            url: line
          } as M3UChannel);
          currentChannel = {};
        }
      }
    }
    
    return channels;
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === 'ECONNABORTED') {
        throw new Error('Tempo limite de conexão excedido. Por favor, verifique sua conexão e tente novamente.');
      }
    }

    if (error && typeof error === 'object' && 'response' in error && error.response && typeof error.response === 'object' && 'status' in error.response) {
      const status = error.response.status as number;
      
      if (status === 401 || status === 403) {
        throw new Error('Credenciais inválidas. Por favor, faça login novamente.');
      }
      
      throw new Error(`Erro ao carregar a lista de canais (${status}). Por favor, tente novamente.`);
    }
    
    throw new Error('Erro ao processar a lista de canais. Por favor, tente novamente.');
  }
}