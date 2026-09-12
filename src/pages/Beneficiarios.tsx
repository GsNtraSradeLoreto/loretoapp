import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface Beneficiario {
  id: string
  nombre: string
  apellido: string
  rama: string
  estado: string
  fecha_nacimiento: string
  tiene_hermanos: boolean
}

export default function Beneficiarios() {
  const { profile, canViewAll, canViewRama } = useAuth()
  const [beneficiarios, setBeneficiarios] = useState<Beneficiario[]>([])
  const [filtered, setFiltered] = useState<Beneficiario[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRama, setFilterRama] = useState('Todas')

  useEffect(() => {
    loadBeneficiarios()
  }, [])

  const loadBeneficiarios = async () => {
    try {
      let query = supabase
        .from('beneficiarios')
        .select('*')
        .order('apellido', { ascending: true })

      if (!canViewAll && profile?.rama_asignada) {
        query = query.eq('rama', profile.rama_asignada)
      }

      const { data, error } = await query

      if (error) throw error
      setBeneficiarios(data || [])
      setFiltered(data || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let result = beneficiarios

    if (filterRama !== 'Todas') {
      result = result.filter(b => b.rama === filterRama)
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      result = result.filter(b =>
        b.nombre.toLowerCase().includes(term) ||
        b.apellido.toLowerCase().includes(term)
      )
    }

    setFiltered(result)
  }, [searchTerm, filterRama, beneficiarios])

  const ramas = ['Todas', 'Manada', 'Unidad Scout', 'Caminantes', 'Rovers']

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
        <span style={{ fontFamily: 'Oswald, sans-serif', color: '#7A7364' }}>Cargando beneficiarios...</span>
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{
          fontFamily: 'Oswald, sans-serif',
          fontWeight: '700',
          fontSize: '28px',
          color: '#24352A',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          margin: 0
        }}>
          📋 Beneficiarios
        </h1>
        <p style={{
          fontFamily: 'Oswald, sans-serif',
          fontWeight: '400',
          fontSize: '16px',
          color: '#7A7364',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          margin: 0
        }}>
          {filtered.length} registros encontrados
        </p>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="🔍 Buscar por nombre..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            flex: 1,
            minWidth: '200px',
            padding: '8px 16px',
            fontSize: '14px',
            border: '2px solid #D1C9B4',
            borderRadius: '8px',
            outline: 'none',
            fontFamily: 'Oswald, sans-serif',
            backgroundColor: 'white'
          }}
        />

        <select
          value={filterRama}
          onChange={(e) => setFilterRama(e.target.value)}
          style={{
            padding: '8px 16px',
            fontSize: '14px',
            border: '2px solid #D1C9B4',
            borderRadius: '8px',
            outline: 'none',
            fontFamily: 'Oswald, sans-serif',
            backgroundColor: 'white',
            cursor: 'pointer'
          }}
        >
          {ramas.map(rama => (
            <option key={rama} value={rama}>{rama}</option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {filtered.map((beneficiario) => (
          <div
            key={beneficiario.id}
            style={{
              backgroundColor: 'white',
              borderRadius: '10px',
              padding: '12px 16px',
              border: '2px solid #D1C9B4',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = '#24352A'}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = '#D1C9B4'}
          >
            <div>
              <div style={{
                fontFamily: 'Oswald, sans-serif',
                fontWeight: '600',
                fontSize: '16px',
                color: '#24352A',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                {beneficiario.apellido}, {beneficiario.nombre}
              </div>
              <div style={{
                fontFamily: 'Oswald, sans-serif',
                fontWeight: '400',
                fontSize: '12px',
                color: '#7A7364',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                {beneficiario.rama} • {beneficiario.estado}
                {beneficiario.tiene_hermanos && ' 👨‍👩‍👧‍👦'}
              </div>
            </div>
            <div style={{
              fontFamily: 'Oswald, sans-serif',
              fontWeight: '400',
              fontSize: '12px',
              color: '#7A7364'
            }}>
              ▶
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '32px 0',
          fontFamily: 'Oswald, sans-serif',
          color: '#7A7364',
          fontSize: '16px',
          textTransform: 'uppercase',
          letterSpacing: '1px'
        }}>
          No se encontraron beneficiarios
        </div>
      )}
    </div>
  )
}