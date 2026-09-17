import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { formatearNombreConH } from '../utils/formatNombre'

interface Beneficiario {
  id: string
  nombre: string
  apellido: string
  rama: string
  estado: string
  fecha_nacimiento: string
  tiene_hermanos: boolean
  foto_url: string | null
}

interface ProgresionManada {
  id: string
  fecha_ingreso_manada: string
  fecha_periodo_introductorio: string
  fecha_pata_tierna: string
  fecha_saltador: string
  fecha_rastreador: string
  fecha_cazador: string
  nombre_caza: string
  tiene_promesa_manada: boolean
  fecha_promesa_manada: string
  progresion_actual: string
}

interface ProgresionUnidad {
  id: string
  fecha_ingreso_unidad: string
  fecha_periodo_introductorio: string
  fecha_pista: string
  fecha_senda: string
  fecha_rumbo: string
  fecha_travesia: string
  tiene_promesa_scout: boolean
  fecha_promesa_scout: string
  padrino_promesa_scout: string
  progresion_actual: string
}

interface ProgresionCaminantes {
  id: string
  fecha_ingreso_caminantes: string
  fecha_periodo_introductorio: string
  fecha_ceremonia_bienvenida: string
  fecha_etapa1: string
  fecha_etapa2: string
  fecha_etapa3: string
  fecha_etapa4: string
  elemento_elegido: string[]
  tiene_promesa_scout: boolean
  fecha_promesa_scout: string
  padrino_promesa_scout: string
  hizo_tada: boolean
  progresion_actual: string
}

interface ProgresionRovers {
  id: string
  fecha_ingreso_rovers: string
  fecha_periodo_introductorio: string
  fecha_encuentro: string
  fecha_compromiso: string
  fecha_proyeccion: string
  fecha_partida: string
  nombre_totem: string
  campamento_totem: string
  tiene_promesa_scout: boolean
  fecha_promesa_scout: string
  padrino_promesa_scout: string
  progresion_actual: string
}

interface Campamento {
  id: string
  nombre: string
  fecha_inicio: string
  fecha_fin: string
  tipo: string
  rama_principal: string
}

// Colores y constantes
const COLORES = {
  fondo: '#F5F1E8',
  verdeScout: '#24352A',
  terracota: '#BF4E30',
  verdeClaro: '#5C7A5E',
  dorado: '#C48A2A',
  textoPrincipal: '#24352A',
  textoSecundario: '#7A7364',
  bordeSuave: '#E8DEC4'
}

const ELEMENTOS_EMOJIS: Record<string, string> = {
  'Tierra': '🌍',
  'Agua': '💧',
  'Aire': '🌬️',
  'Fuego': '🔥'
}

export default function VidaScout() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isSuperAdmin, isJefatura, getRolData } = useAuth()

  const [beneficiario, setBeneficiario] = useState<Beneficiario | null>(null)
  const [progresionManada, setProgresionManada] = useState<ProgresionManada | null>(null)
  const [progresionUnidad, setProgresionUnidad] = useState<ProgresionUnidad | null>(null)
  const [progresionCaminantes, setProgresionCaminantes] = useState<ProgresionCaminantes | null>(null)
  const [progresionRovers, setProgresionRovers] = useState<ProgresionRovers | null>(null)
  const [campamentos, setCampamentos] = useState<Campamento[]>([])
  const [loading, setLoading] = useState(true)

  const rolData = getRolData()
  const esJefe = rolData.tipo === 'jefe'

  useEffect(() => {
    if (id) loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const loadData = async () => {
    try {
      setLoading(true)

      const [
        beneficiarioRes,
        manadaRes,
        unidadRes,
        caminantesRes,
        roversRes,
        campamentosRes
      ] = await Promise.all([
        supabase.from('beneficiarios').select('*').eq('id', id).single(),
        supabase.from('progresion_manada').select('*').eq('beneficiario_id', id).maybeSingle(),
        supabase.from('progresion_unidad').select('*').eq('beneficiario_id', id).maybeSingle(),
        supabase.from('progresion_caminantes').select('*').eq('beneficiario_id', id).maybeSingle(),
        supabase.from('progresion_rovers').select('*').eq('beneficiario_id', id).maybeSingle(),
        supabase.from('campamentos_asistidos')
          .select(`
            id,
            campamento_id,
            campamentos (
              nombre,
              fecha_inicio,
              fecha_fin,
              tipo,
              rama_principal
            )
          `)
          .eq('beneficiario_id', id)
      ])

      if (beneficiarioRes.error) throw beneficiarioRes.error
      setBeneficiario(beneficiarioRes.data)

      setProgresionManada(manadaRes.data || null)
      setProgresionUnidad(unidadRes.data || null)
      setProgresionCaminantes(caminantesRes.data || null)
      setProgresionRovers(roversRes.data || null)

      if (campamentosRes.data) {
        const mapeados = campamentosRes.data.map((c: any) => ({
          id: c.id,
          nombre: c.campamentos?.nombre || 'Sin nombre',
          fecha_inicio: c.campamentos?.fecha_inicio || '',
          fecha_fin: c.campamentos?.fecha_fin || '',
          tipo: c.campamentos?.tipo || '',
          rama_principal: c.campamentos?.rama_principal || ''
        }))
        mapeados.sort((a, b) =>
          new Date(b.fecha_inicio).getTime() - new Date(a.fecha_inicio).getTime()
        )
        setCampamentos(mapeados)
      }
    } catch (error) {
      console.error('Error al cargar datos:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatFecha = (fecha: string | null | undefined) => {
    if (!fecha) return '-'
    const partes = fecha.split('-')
    if (partes.length !== 3) return '-'
    return `${partes[2]}/${partes[1]}/${partes[0]}`
  }

  const getRamaLabel = (rama: string) => {
    const labels: Record<string, string> = {
      'Manada': '🐺 Manada',
      'Unidad Scout': '⚜️ Unidad Scout',
      'Caminantes': '🏔️ Caminantes',
      'Rovers': '🔥 Rovers'
    }
    return labels[rama] || rama
  }

  const getFotoUrl = (fotoUrl: string | null, nombre: string, apellido: string) => {
    if (fotoUrl) return fotoUrl
    const iniciales = `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase()
    return `data:image/svg+xml,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
        <rect width="96" height="96" rx="12" fill="#24352A"/>
        <text x="48" y="58" font-family="Oswald, sans-serif" font-size="34" fill="white" text-anchor="middle">${iniciales || 'U'}</text>
      </svg>
    `)}`
  }

  // ==================== RENDER DE PROGRESIÓN POR RAMA ====================
  const renderProgresion = () => {
    if (!beneficiario) return null
    const rama = beneficiario.rama

    // Helper para renderizar un hito
    const renderHito = (
      label: string,
      fecha: string | null | undefined,
      elemento?: string | null
    ) => {
      const tieneFecha = !!fecha
      return (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 12px',
            backgroundColor: tieneFecha ? '#F0F7F0' : '#FFFFFF',
            border: `2px solid ${tieneFecha ? '#B8D4B8' : '#E8DEC4'}`,
            borderRadius: '10px',
            marginBottom: '8px'
          }}
        >
          <span style={{ fontSize: '20px', flexShrink: 0 }}>
            {tieneFecha ? '✅' : '⬜'}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: 'Oswald, sans-serif',
              fontSize: 'clamp(12px, 3vw, 14px)',
              fontWeight: '600',
              color: COLORES.textoPrincipal,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              {label}
              {elemento && (
                <span style={{ marginLeft: '6px', fontSize: '13px' }}>
                  {ELEMENTOS_EMOJIS[elemento] || ''} {elemento}
                </span>
              )}
            </div>
            <div style={{
              fontFamily: 'Oswald, sans-serif',
              fontSize: 'clamp(11px, 2.5vw, 13px)',
              color: tieneFecha ? COLORES.verdeClaro : COLORES.textoSecundario,
              marginTop: '2px'
            }}>
              {tieneFecha ? formatFecha(fecha) : 'Sin cargar'}
            </div>
          </div>
        </div>
      )
    }

    // Armar la lista de hitos según la rama
    if (rama === 'Manada' && progresionManada) {
      return (
        <div>
          {/* Info general */}
          <InfoGeneral
            ingreso={progresionManada.fecha_ingreso_manada}
            introductorio={progresionManada.fecha_periodo_introductorio}
            promesa={progresionManada.tiene_promesa_manada}
            fechaPromesa={progresionManada.fecha_promesa_manada}
            padrino={null}
            progresionActual={progresionManada.progresion_actual}
            nombreCaza={progresionManada.nombre_caza}
          />
          {/* Hitos */}
          <div style={{ marginTop: '16px' }}>
            <Subtitulo texto="Hitos de la rama" />
            {renderHito('Pata tierna', progresionManada.fecha_pata_tierna)}
            {renderHito('Saltador', progresionManada.fecha_saltador)}
            {renderHito('Rastreador', progresionManada.fecha_rastreador)}
            {renderHito('Cazador', progresionManada.fecha_cazador)}
          </div>
        </div>
      )
    }

    if (rama === 'Unidad Scout' && progresionUnidad) {
      return (
        <div>
          <InfoGeneral
            ingreso={progresionUnidad.fecha_ingreso_unidad}
            introductorio={progresionUnidad.fecha_periodo_introductorio}
            promesa={progresionUnidad.tiene_promesa_scout}
            fechaPromesa={progresionUnidad.fecha_promesa_scout}
            padrino={progresionUnidad.padrino_promesa_scout}
            progresionActual={progresionUnidad.progresion_actual}
          />
          <div style={{ marginTop: '16px' }}>
            <Subtitulo texto="Hitos de la rama" />
            {renderHito('Pista', progresionUnidad.fecha_pista)}
            {renderHito('Senda', progresionUnidad.fecha_senda)}
            {renderHito('Rumbo', progresionUnidad.fecha_rumbo)}
            {renderHito('Travesía', progresionUnidad.fecha_travesia)}
          </div>
        </div>
      )
    }

    if (rama === 'Caminantes' && progresionCaminantes) {
      const elementos = Array.isArray(progresionCaminantes.elemento_elegido)
        ? progresionCaminantes.elemento_elegido
        : []

      return (
        <div>
          <InfoGeneral
            ingreso={progresionCaminantes.fecha_ingreso_caminantes}
            introductorio={progresionCaminantes.fecha_periodo_introductorio}
            promesa={progresionCaminantes.tiene_promesa_scout}
            fechaPromesa={progresionCaminantes.fecha_promesa_scout}
            padrino={progresionCaminantes.padrino_promesa_scout}
            progresionActual={progresionCaminantes.progresion_actual}
          />
          <div style={{ marginTop: '16px' }}>
            <Subtitulo texto="Ceremonia de Bienvenida" />
            {renderHito('Ceremonia de Bienvenida', progresionCaminantes.fecha_ceremonia_bienvenida)}

            <Subtitulo texto="Hitos de la rama" />
            {renderHito('Etapa 1', progresionCaminantes.fecha_etapa1, elementos[0])}
            {renderHito('Etapa 2', progresionCaminantes.fecha_etapa2, elementos[1])}
            {renderHito('Etapa 3', progresionCaminantes.fecha_etapa3, elementos[2])}
            {renderHito('Etapa 4', progresionCaminantes.fecha_etapa4, elementos[3])}
          </div>
        </div>
      )
    }

    if (rama === 'Rovers' && progresionRovers) {
      return (
        <div>
          <InfoGeneral
            ingreso={progresionRovers.fecha_ingreso_rovers}
            introductorio={progresionRovers.fecha_periodo_introductorio}
            promesa={progresionRovers.tiene_promesa_scout}
            fechaPromesa={progresionRovers.fecha_promesa_scout}
            padrino={progresionRovers.padrino_promesa_scout}
            progresionActual={progresionRovers.progresion_actual}
          />
          <div style={{ marginTop: '16px' }}>
            <Subtitulo texto="Hitos de la rama" />
            {renderHito('Encuentro', progresionRovers.fecha_encuentro)}
            {renderHito('Compromiso', progresionRovers.fecha_compromiso)}
            {renderHito('Proyección', progresionRovers.fecha_proyeccion)}
            {renderHito('Partida', progresionRovers.fecha_partida)}
          </div>

          {(progresionRovers.nombre_totem || progresionRovers.campamento_totem) && (
            <div style={{ marginTop: '16px' }}>
              <Subtitulo texto="Tótem" />
              <div style={{
                backgroundColor: '#FFF8E7',
                border: '2px solid #F5C842',
                borderRadius: '10px',
                padding: '12px'
              }}>
                {progresionRovers.nombre_totem && (
                  <div style={{
                    fontFamily: 'Oswald, sans-serif',
                    fontSize: 'clamp(13px, 3vw, 15px)',
                    color: COLORES.textoPrincipal,
                    fontWeight: '600'
                  }}>
                    🦅 {progresionRovers.nombre_totem}
                  </div>
                )}
                {progresionRovers.campamento_totem && (
                  <div style={{
                    fontFamily: 'Oswald, sans-serif',
                    fontSize: 'clamp(11px, 2.5vw, 13px)',
                    color: COLORES.textoSecundario,
                    marginTop: '4px'
                  }}>
                    🏕️ {progresionRovers.campamento_totem}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )
    }

    return (
      <div style={{
        textAlign: 'center',
        padding: '24px 0',
        fontFamily: 'Oswald, sans-serif',
        color: COLORES.textoSecundario
      }}>
        No hay información de progresión cargada
      </div>
    )
  }

  // ==================== HISTORIAL SCOUT ====================
  const renderHistorial = () => {
    if (!beneficiario) return null

    const eventos: { fecha: string, titulo: string, detalle: string, color: string }[] = []

    if (beneficiario.fecha_ingreso_grupo) {
      eventos.push({
        fecha: beneficiario.fecha_ingreso_grupo,
        titulo: '📋 Ingreso al Grupo',
        detalle: 'Se suma al grupo scout',
        color: COLORES.verdeScout
      })
    }

    if (beneficiario.fecha_entrega_uniforme) {
      eventos.push({
        fecha: beneficiario.fecha_entrega_uniforme,
        titulo: '👕 Entrega de Uniforme',
        detalle: 'Recibe su uniforme scout',
        color: COLORES.terracota
      })
    }

    if (progresionManada?.tiene_promesa_manada && progresionManada.fecha_promesa_manada) {
      eventos.push({
        fecha: progresionManada.fecha_promesa_manada,
        titulo: '🤝 Promesa de Manada',
        detalle: 'Realiza su promesa de Manada',
        color: COLORES.verdeClaro
      })
    }

    // Promesa scout (solo una entre Unidad, Caminantes, Rovers)
    let promesaFecha = ''
    let promesaPadrino = ''
    let promesaRama = ''

    if (progresionUnidad?.tiene_promesa_scout && progresionUnidad.fecha_promesa_scout) {
      promesaFecha = progresionUnidad.fecha_promesa_scout
      promesaPadrino = progresionUnidad.padrino_promesa_scout || ''
      promesaRama = 'Unidad Scout'
    } else if (progresionCaminantes?.tiene_promesa_scout && progresionCaminantes.fecha_promesa_scout) {
      promesaFecha = progresionCaminantes.fecha_promesa_scout
      promesaPadrino = progresionCaminantes.padrino_promesa_scout || ''
      promesaRama = 'Caminantes'
    } else if (progresionRovers?.tiene_promesa_scout && progresionRovers.fecha_promesa_scout) {
      promesaFecha = progresionRovers.fecha_promesa_scout
      promesaPadrino = progresionRovers.padrino_promesa_scout || ''
      promesaRama = 'Rovers'
    }

    if (promesaFecha) {
      eventos.push({
        fecha: promesaFecha,
        titulo: '🤝 Promesa Scout',
        detalle: promesaPadrino
          ? `Padrino/Madrina: ${promesaPadrino} (${promesaRama})`
          : `Promesa Scout (${promesaRama})`,
        color: COLORES.dorado
      })
    }

    if (progresionManada?.fecha_ingreso_manada) {
      eventos.push({
        fecha: progresionManada.fecha_ingreso_manada,
        titulo: '🐺 Ingreso a Manada',
        detalle: 'Ingresa a la Manada',
        color: COLORES.verdeClaro
      })
    }

    if (progresionUnidad?.fecha_ingreso_unidad) {
      eventos.push({
        fecha: progresionUnidad.fecha_ingreso_unidad,
        titulo: '⚜️ Ingreso a Unidad Scout',
        detalle: 'Ingresa a la Unidad Scout',
        color: COLORES.dorado
      })
    }

    if (progresionCaminantes?.fecha_ingreso_caminantes) {
      eventos.push({
        fecha: progresionCaminantes.fecha_ingreso_caminantes,
        titulo: '🏔️ Ingreso a Caminantes',
        detalle: 'Ingresa a Caminantes',
        color: COLORES.terracota
      })
    }

    if (progresionRovers?.fecha_ingreso_rovers) {
      eventos.push({
        fecha: progresionRovers.fecha_ingreso_rovers,
        titulo: '🔥 Ingreso a Rovers',
        detalle: 'Ingresa a Rovers',
        color: COLORES.terracota
      })
    }

    eventos.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())

    if (eventos.length === 0) {
      return (
        <div style={{
          textAlign: 'center',
          padding: '32px 0',
          fontFamily: 'Oswald, sans-serif',
          color: COLORES.textoSecundario
        }}>
          Todavía no hay eventos en el historial
        </div>
      )
    }

    return (
      <div style={{ position: 'relative', paddingLeft: '28px' }}>
        {/* Línea vertical */}
        <div style={{
          position: 'absolute',
          left: '6px',
          top: '8px',
          bottom: '8px',
          width: '3px',
          backgroundColor: COLORES.bordeSuave,
          borderRadius: '2px'
        }} />

        {eventos.map((evento, idx) => (
          <div key={idx} style={{ position: 'relative', marginBottom: '16px' }}>
            {/* Punto */}
            <div style={{
              position: 'absolute',
              left: '-28px',
              top: '6px',
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              backgroundColor: evento.color,
              border: `3px solid ${COLORES.fondo}`,
              boxShadow: `0 0 0 2px ${evento.color}`
            }} />

            {/* Card */}
            <div style={{
              backgroundColor: '#FFFFFF',
              border: `2px solid ${COLORES.bordeSuave}`,
              borderRadius: '10px',
              padding: '10px 12px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: 'Oswald, sans-serif',
                    fontSize: 'clamp(13px, 3vw, 15px)',
                    fontWeight: '600',
                    color: COLORES.textoPrincipal,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    {evento.titulo}
                  </div>
                  <div style={{
                    fontFamily: 'Oswald, sans-serif',
                    fontSize: 'clamp(11px, 2.5vw, 13px)',
                    color: COLORES.textoSecundario,
                    marginTop: '2px'
                  }}>
                    {evento.detalle}
                  </div>
                </div>
                <div style={{
                  fontFamily: 'Oswald, sans-serif',
                  fontSize: 'clamp(10px, 2vw, 12px)',
                  color: COLORES.textoSecundario,
                  backgroundColor: COLORES.fondo,
                  padding: '2px 8px',
                  borderRadius: '10px',
                  whiteSpace: 'nowrap'
                }}>
                  {formatFecha(evento.fecha)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  // ==================== LOADING / NO ENCONTRADO ====================
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
        <span style={{ fontFamily: 'Oswald, sans-serif', color: COLORES.textoSecundario }}>
          Cargando...
        </span>
      </div>
    )
  }

  if (!beneficiario) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
        <span style={{ fontFamily: 'Oswald, sans-serif', color: COLORES.terracota }}>
          Beneficiario no encontrado
        </span>
      </div>
    )
  }

  const nombreCompleto = formatearNombreConH(
    beneficiario.nombre,
    beneficiario.apellido,
    beneficiario.tiene_hermanos
  )

  const fotoUrl = getFotoUrl(beneficiario.foto_url, beneficiario.nombre, beneficiario.apellido)

  return (
    <div style={{ fontFamily: 'Oswald, sans-serif' }}>
      {/* Botón volver */}
      <button
        onClick={() => navigate(`/beneficiario/${id}`)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: COLORES.textoSecundario,
          fontSize: 'clamp(12px, 3vw, 14px)',
          fontFamily: 'Oswald, sans-serif',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          padding: '8px 0',
          marginBottom: '12px'
        }}
      >
        ← Volver al perfil
      </button>

      {/* Encabezado scout */}
      <div style={{
        backgroundColor: COLORES.verdeScout,
        borderRadius: '16px',
        padding: '24px 16px',
        textAlign: 'center',
        marginBottom: '20px',
        border: `3px solid ${COLORES.dorado}`
      }}>
        <div style={{
          fontSize: 'clamp(11px, 2.5vw, 13px)',
          color: COLORES.dorado,
          letterSpacing: '3px',
          textTransform: 'uppercase',
          marginBottom: '8px'
        }}>
          ⚜️ Vida Scout ⚜️
        </div>
        <h1 style={{
          fontSize: 'clamp(18px, 5vw, 24px)',
          color: '#F3ECD8',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          margin: '0 0 12px 0',
          fontWeight: '700',
          wordBreak: 'break-word'
        }}>
          {nombreCompleto}
        </h1>
        <div style={{
          display: 'inline-block',
          padding: '4px 14px',
          backgroundColor: COLORES.terracota,
          color: '#FFFFFF',
          borderRadius: '20px',
          fontSize: 'clamp(11px, 2.5vw, 13px)',
          letterSpacing: '0.5px',
          textTransform: 'uppercase'
        }}>
          {getRamaLabel(beneficiario.rama)}
        </div>
        <div style={{ marginTop: '16px' }}>
          <img
            src={fotoUrl}
            alt={nombreCompleto}
            style={{
              width: 'clamp(80px, 20vw, 100px)',
              height: 'clamp(80px, 20vw, 100px)',
              objectFit: 'cover',
              borderRadius: '50%',
              border: `4px solid ${COLORES.dorado}`
            }}
          />
        </div>
      </div>

      {/* Bloque 1: Progresión */}
      <Seccion titulo="📈 Progresión" color={COLORES.verdeScout}>
        {renderProgresion()}
      </Seccion>

      {/* Bloque 2: Campamentos */}
      <Seccion titulo="🏕️ Campamentos asistidos" color={COLORES.terracota}>
        {campamentos.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '24px 0',
            color: COLORES.textoSecundario,
            fontSize: 'clamp(12px, 3vw, 14px)'
          }}>
            Todavía no asistió a ningún campamento
          </div>
        ) : (
          <div>
            {campamentos.map((camp) => (
              <div
                key={camp.id}
                style={{
                  backgroundColor: '#FFFFFF',
                  border: `2px solid ${COLORES.bordeSuave}`,
                  borderRadius: '10px',
                  padding: '12px',
                  marginBottom: '8px'
                }}
              >
                <div style={{
                  fontSize: 'clamp(13px, 3vw, 15px)',
                  fontWeight: '600',
                  color: COLORES.textoPrincipal,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '4px'
                }}>
                  🏕️ {camp.nombre}
                </div>
                <div style={{
                  fontSize: 'clamp(11px, 2.5vw, 13px)',
                  color: COLORES.textoSecundario
                }}>
                  📅 {formatFecha(camp.fecha_inicio)}
                  {camp.fecha_fin && camp.fecha_fin !== camp.fecha_inicio && ` - ${formatFecha(camp.fecha_fin)}`}
                </div>
                {camp.tipo && (
                  <div style={{
                    fontSize: 'clamp(10px, 2vw, 12px)',
                    color: COLORES.terracota,
                    marginTop: '4px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    {camp.tipo}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Seccion>

      {/* Bloque 3: Historial */}
      <Seccion titulo="📜 Historial Scout" color={COLORES.dorado}>
        {renderHistorial()}
      </Seccion>
    </div>
  )
}

// ==================== COMPONENTES AUXILIARES ====================

const Seccion = ({
  titulo,
  color,
  children
}: {
  titulo: string,
  color: string,
  children: React.ReactNode
}) => (
  <div style={{
    backgroundColor: '#FFFFFF',
    border: `2px solid ${COLORES.bordeSuave}`,
    borderRadius: '16px',
    padding: '16px',
    marginBottom: '16px'
  }}>
    <div style={{
      fontFamily: 'Oswald, sans-serif',
      fontSize: 'clamp(14px, 3.5vw, 17px)',
      fontWeight: '700',
      color: color,
      textTransform: 'uppercase',
      letterSpacing: '1px',
      paddingBottom: '10px',
      marginBottom: '14px',
      borderBottom: `2px dashed ${COLORES.bordeSuave}`
    }}>
      {titulo}
    </div>
    {children}
  </div>
)

const Subtitulo = ({ texto }: { texto: string }) => (
  <div style={{
    fontFamily: 'Oswald, sans-serif',
    fontSize: 'clamp(11px, 2.5vw, 13px)',
    color: COLORES.textoSecundario,
    textTransform: 'uppercase',
    letterSpacing: '1px',
    marginTop: '12px',
    marginBottom: '8px',
    fontWeight: '600'
  }}>
    {texto}
  </div>
)

const InfoGeneral = ({
  ingreso,
  introductorio,
  promesa,
  fechaPromesa,
  padrino,
  progresionActual,
  nombreCaza
}: {
  ingreso: string | null | undefined
  introductorio: string | null | undefined
  promesa: boolean | null | undefined
  fechaPromesa: string | null | undefined
  padrino: string | null | undefined
  progresionActual: string | null | undefined
  nombreCaza?: string | null
}) => {
  const formatFecha = (fecha: string | null | undefined) => {
    if (!fecha) return '-'
    const partes = fecha.split('-')
    if (partes.length !== 3) return '-'
    return `${partes[2]}/${partes[1]}/${partes[0]}`
  }

  return (
    <div style={{
      backgroundColor: '#F0F7F0',
      border: `2px solid #B8D4B8`,
      borderRadius: '12px',
      padding: '14px'
    }}>
      {/* Progresión actual */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
        marginBottom: '12px',
        flexWrap: 'wrap'
      }}>
        <span style={{
          fontSize: 'clamp(11px, 2.5vw, 13px)',
          color: COLORES.textoSecundario,
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          ⭐ Progresión actual
        </span>
        <span style={{
          fontSize: 'clamp(14px, 3.5vw, 16px)',
          fontWeight: '700',
          color: COLORES.verdeScout,
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          {progresionActual || 'Sin asignar'}
        </span>
      </div>

      {/* Ingreso a la rama */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: '8px',
        marginBottom: '6px',
        flexWrap: 'wrap'
      }}>
        <span style={{ fontSize: 'clamp(11px, 2.5vw, 13px)', color: COLORES.textoSecundario }}>
          🗓️ Ingreso a la rama
        </span>
        <span style={{ fontSize: 'clamp(11px, 2.5vw, 13px)', color: COLORES.textoPrincipal, fontWeight: '600' }}>
          {formatFecha(ingreso)}
        </span>
      </div>

      {/* Período introductorio */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: '8px',
        marginBottom: '6px',
        flexWrap: 'wrap'
      }}>
        <span style={{ fontSize: 'clamp(11px, 2.5vw, 13px)', color: COLORES.textoSecundario }}>
          🗓️ Período Introductorio
        </span>
        <span style={{ fontSize: 'clamp(11px, 2.5vw, 13px)', color: COLORES.textoPrincipal, fontWeight: '600' }}>
          {formatFecha(introductorio)}
        </span>
      </div>

      {/* Promesa */}
      {promesa && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '8px',
          marginBottom: '6px',
          flexWrap: 'wrap'
        }}>
          <span style={{ fontSize: 'clamp(11px, 2.5vw, 13px)', color: COLORES.textoSecundario }}>
            🤝 Promesa
          </span>
          <span style={{ fontSize: 'clamp(11px, 2.5vw, 13px)', color: COLORES.textoPrincipal, fontWeight: '600' }}>
            {formatFecha(fechaPromesa)}
            {padrino && ` · ${padrino}`}
          </span>
        </div>
      )}

      {/* Nombre de caza (solo Manada) */}
      {nombreCaza && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '8px',
          flexWrap: 'wrap'
        }}>
          <span style={{ fontSize: 'clamp(11px, 2.5vw, 13px)', color: COLORES.textoSecundario }}>
            🐺 Nombre de caza
          </span>
          <span style={{ fontSize: 'clamp(11px, 2.5vw, 13px)', color: COLORES.textoPrincipal, fontWeight: '600' }}>
            {nombreCaza}
          </span>
        </div>
      )}
    </div>
  )
}