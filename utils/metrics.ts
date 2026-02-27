
export type MetricEvent = 
  // 1. Inicio y progreso
  | 'protocol_iniciado' 
  | 'protocol_completado' 
  | 'cargar_conciencia'
  // 2. Sesión
  | 'session_start' 
  | 'session_end' 
  // 3. Interacción
  | 'mensaje_voz' 
  | 'mensaje_texto' 
  // 4. Progresión afectiva
  | 'etapa_relacional'
  | 'tono_cambio'
  | 'pregunta_profundidad'
  | 'tema_interaccion'
  // 5. Memoria emocional
  | 'memoria_emocional'
  | 'seguimiento_proyecto'
  | 'conflicto_emocional'
  | 'conflicto_resuelto'
  // 6. Retención
  | 'retention_check'
  // 7. Multimodal
  | 'camara_activada'
  | 'voz_activada'
  | 'modo_interaccion'
  | 'avatar_visible'
  // 8. Adicionales
  | 'idioma'
  | 'avatar_cargado';

interface MetricPayload {
  event: MetricEvent;
  userId: string;
  sessionId?: string;
  data?: Record<string, any>;
  timestamp: string; // Unified to ISO 8601
}

const USER_ID_KEY = 'lyos_metrics_user_id';

const getUserId = () => {
  let id = localStorage.getItem(USER_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(USER_ID_KEY, id);
  }
  return id;
};

let currentSessionId: string | null = null;

export const trackMetric = (event: MetricEvent, data?: Record<string, any>) => {
  // Metrics tracking is currently disabled
  return;
  
  if (event === 'session_start') {
    currentSessionId = crypto.randomUUID();
  }

  const payload: MetricPayload = {
    event,
    userId: getUserId(),
    sessionId: currentSessionId || undefined,
    data,
    timestamp: new Date().toISOString()
  };

  fetch('/api/metrics', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  }).catch(err => {
    console.debug('Metrics failed', err);
  });
};

export const getSessionId = () => currentSessionId;
