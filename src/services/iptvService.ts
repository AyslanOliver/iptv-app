interface IptvCredentials {
  username: string;
  password: string;
}

interface IptvConfig {
  baseUrl: string;
}

const IPTV_CONFIG: IptvConfig = {
  baseUrl: 'http://zeusodin.online',
};

export const getStreamUrl = (credentials: IptvCredentials): string => {
  const username = credentials?.username || '';
  const password = credentials?.password || '';
  return `${IPTV_CONFIG.baseUrl}/get.php?username=${username}&password=${password}&type=m3u_plus&output=m3u8`;
};



export const validateCredentials = async (credentials: IptvCredentials): Promise<boolean> => {
  try {
    const url = getStreamUrl(credentials);
    const response = await fetch(url);
    return response.ok;
  } catch (error) {
    console.error('Erro ao validar credenciais:', error);
    return false;
  }
};

// Função para buscar dados EPG do zed7.top
export const getEpgData = async (credentials: IptvCredentials): Promise<any> => {
  try {
    const { username, password } = credentials;
    const epgUrl = `/epg?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
    
    console.log('🔍 Buscando dados EPG via proxy:', epgUrl);
    
    const response = await fetch(epgUrl, {
      headers: {
        'Accept': 'application/xml, text/xml, */*',
        'Content-Type': 'application/xml'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const xmlData = await response.text();
    console.log('📄 Dados XML recebidos:', xmlData.length, 'caracteres');
    
    if (xmlData.length < 100) {
      console.warn('⚠️ Dados XML muito pequenos, possível erro:', xmlData);
    }
    
    return parseEpgXml(xmlData);
  } catch (error) {
    console.error('❌ Erro ao buscar EPG:', error);
    return {};
  }
};

// Função para fazer parse do XML EPG
const parseEpgXml = (xmlData: string): any => {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlData, 'text/xml');
    
    // Verificar se há erros de parsing
    const parseError = doc.getElementsByTagName('parsererror');
    if (parseError.length > 0) {
      console.error('❌ Erro de parsing XML:', parseError[0].textContent);
      return {};
    }
    
    const programmes = doc.querySelectorAll('programme');
    const epgData: Record<string, any[]> = {};
    
    programmes.forEach(programme => {
      const channel = programme.getAttribute('channel');
      const start = programme.getAttribute('start');
      const stop = programme.getAttribute('stop');
      const titleElement = programme.querySelector('title');
      const descElement = programme.querySelector('desc');
      
      if (channel) {
        if (!epgData[channel]) {
          epgData[channel] = [];
        }
        
        epgData[channel].push({
          channel,
          start,
          stop,
          title: titleElement ? titleElement.textContent : 'Sem título',
          description: descElement ? descElement.textContent : 'Sem descrição',
          startTime: parseXmltvTime(start),
          stopTime: parseXmltvTime(stop)
        });
      }
    });
    
    console.log('✅ EPG parseado:', Object.keys(epgData).length, 'canais');
    return epgData;
  } catch (error) {
    console.error('❌ Erro no parse EPG:', error);
    return {};
  }
};

// Função para converter tempo XMLTV para timestamp
const parseXmltvTime = (xmltvTime: string | null): number => {
  if (!xmltvTime) return Date.now() / 1000;
  
  try {
    // Formato XMLTV: 20231201120000 +0000
    const timeStr = xmltvTime.split(' ')[0];
    const year = parseInt(timeStr.substring(0, 4));
    const month = parseInt(timeStr.substring(4, 6)) - 1;
    const day = parseInt(timeStr.substring(6, 8));
    const hour = parseInt(timeStr.substring(8, 10));
    const minute = parseInt(timeStr.substring(10, 12));
    const second = parseInt(timeStr.substring(12, 14));
    
    const date = new Date(year, month, day, hour, minute, second);
    return Math.floor(date.getTime() / 1000);
  } catch (error) {
    return Date.now() / 1000;
  }
};

// Função para gerar URL de catchup
export const generateCatchupUrl = (credentials: IptvCredentials, channelId: string, utcStart: string, duration: number): string => {
  const { username, password } = credentials;
  
  // Usar proxy local para evitar CORS
  const catchupURL = `/stream/timeshift/${username}/${password}/${channelId}.m3u8?utc=${utcStart}&duration=${duration}`;
  
  console.log('🔄 URL de catchup gerada via proxy:', catchupURL);
  console.log('📅 Parâmetros:', { channelId, utcStart, duration });
  
  return catchupURL;
};

// Função para formatar timestamp para formato XMLTV UTC
export const formatToXmltvUtc = (timestamp: number): string => {
  const date = new Date(timestamp * 1000);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hour = String(date.getUTCHours()).padStart(2, '0');
  const minute = String(date.getUTCMinutes()).padStart(2, '0');
  const second = String(date.getUTCSeconds()).padStart(2, '0');
  
  return `${year}${month}${day}${hour}${minute}${second}`;
};

export const getSeriesList = async (credentials: IptvCredentials): Promise<any> => {
  try {
    const { username, password } = credentials;
    const url = `/api/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&action=get_series`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      if (response.status === 503) {
        throw new Error('Servidor IPTV temporariamente indisponível. Tente novamente em alguns minutos.');
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Processar e formatar os dados das séries
    const formattedData = Array.isArray(data) ? data.map((series: any) => ({
      series_id: series.series_id || series.id,
      name: series.name || series.title,
      cover: series.cover || series.poster,
      plot: series.plot || series.description,
      cast: series.cast,
      director: series.director,
      genre: series.genre,
      releaseDate: series.releasedate || series.release_date,
      rating: series.rating,
      last_modified: series.last_modified,
      category_id: series.category_id,
      seasons_count: series.seasons_count || 0,
      episodes_count: series.episodes_count || 0
    })) : [];

    return formattedData;
  } catch (error) {
    console.error('Error fetching series list:', error);
    return [];
  }
};

export const getSeriesInfo = async (credentials: IptvCredentials, seriesId: string): Promise<any> => {
  try {
    const { username, password } = credentials;
    const url = `/api/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&action=get_series_info&series_id=${seriesId}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      if (response.status === 503) {
        throw new Error('Servidor IPTV temporariamente indisponível. Tente novamente em alguns minutos.');
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching series info:', error);
    return null;
  }
};

export const getSeriesEpisodes = async (credentials: IptvCredentials, seriesId: string): Promise<any> => {
  try {
    const { username, password } = credentials;
    
    // Tentar diferentes endpoints para episódios
    const endpoints = [
      `get_series&series_id=${seriesId}`,
      `get_vod_info&vod_id=${seriesId}`,
      `get_series_info&series_id=${seriesId}`
    ];
    
    for (const endpoint of endpoints) {
       const url = `/api/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&action=${endpoint}`;
       
       try {
         const response = await fetch(url);
         if (response.ok) {
           const data = await response.json();
           
           // Verificar se há episódios nos dados
           if (data && (data.episodes || data.seasons || Array.isArray(data))) {
             console.log(`Episodes found using endpoint: ${endpoint}`);
             return data;
           }
         }
       } catch (endpointError) {
         // Silenciar erros de endpoints individuais
       }
     }
    
    console.log('Nenhum endpoint retornou episódios válidos');
    return null;
  } catch (error) {
    console.error('Error fetching series episodes:', error);
    return null;
  }
};

export const getChannels = async (credentials: IptvCredentials): Promise<any> => {
  try {
    const { username, password } = credentials;
    const url = `/api/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&action=get_live_streams`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching channels:', error);
    return [];
  }
};

export const getCategories = async (credentials: IptvCredentials): Promise<any> => {
  try {
    const { username, password } = credentials;
    const url = `/api/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&action=get_live_categories`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
};

export const getSeriesCategories = async (credentials: IptvCredentials): Promise<any> => {
  try {
    const { username, password } = credentials;
    const url = `/api/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&action=get_series_categories`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      if (response.status === 503) {
        throw new Error('Servidor IPTV temporariamente indisponível. Tente novamente em alguns minutos.');
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching series categories:', error);
    return [];
  }
};