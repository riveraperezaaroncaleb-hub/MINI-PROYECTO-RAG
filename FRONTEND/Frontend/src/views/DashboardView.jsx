import { useEffect, useState } from 'react'
import CollaboratorReports from '../components/dashboard/CollaboratorReports'
import ExecutiveSummary from '../components/dashboard/ExecutiveSummary'
import KpiCard from '../components/dashboard/KpiCard'
import PendingTable from '../components/dashboard/PendingTable'
import ReportHistory from '../components/dashboard/ReportHistory'
import TrendChart from '../components/dashboard/TrendChart'
import Spinner from '../components/Spinner'
import {
  obtenerHistorial,
  obtenerReporteActual,
  obtenerReportePorId,
  obtenerTendencia,
} from '../services/reportes.service'
import { actualizarEstado, obtenerPendientes } from '../services/solicitudes.service'

export default function DashboardView() {
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [reporte, setReporte] = useState(null)
  const [cifras, setCifras] = useState(null)
  const [resumen, setResumen] = useState('')
  const [reporteActivoId, setReporteActivoId] = useState(null)
  const [tendencia, setTendencia] = useState([])
  const [solicitudes, setSolicitudes] = useState([])
  const [historial, setHistorial] = useState([])
  const [colaboradorSeleccionado, setColaboradorSeleccionado] = useState(null)

  useEffect(() => {
    let activo = true

    const cargar = async () => {
      setCargando(true)
      setError('')

      try {
        const [actual, serie, pendientes, reportes] = await Promise.all([
          obtenerReporteActual().catch(() => null),
          obtenerTendencia(),
          obtenerPendientes(),
          obtenerHistorial(),
        ])

        if (!activo) return

        setReporte(actual)
        setCifras(actual?.datos_json || null)
        setResumen(actual?.resumen_texto || '')
        setReporteActivoId(actual?.id || null)
        setColaboradorSeleccionado(null)
        setTendencia(serie)
        setSolicitudes(pendientes)
        setHistorial(reportes)
      } catch {
        if (activo) setError('No se pudo cargar la información del dashboard.')
      } finally {
        if (activo) setCargando(false)
      }
    }

    cargar()
    return () => {
      activo = false
    }
  }, [])

  const seleccionarReporte = async (id) => {
    try {
      const seleccionado = await obtenerReportePorId(id)
      setReporte(seleccionado)
      setCifras(seleccionado.datos_json || null)
      setResumen(seleccionado.resumen_texto || '')
      setReporteActivoId(seleccionado.id)
      setColaboradorSeleccionado(null)
    } catch {
      setError('No se pudo cargar el reporte seleccionado.')
    }
  }

  const cambiarEstado = async (id, estado) => {
    try {
      await actualizarEstado(id, estado)
      setSolicitudes((actuales) => actuales.filter((solicitud) => solicitud.id !== id))
    } catch {
      setError('No se pudo actualizar la solicitud.')
    }
  }

  if (cargando) return <Spinner label="Cargando dashboard…" />

  const rotacion =
    cifras?.movimientosRecientes?.rotacionPorcentaje ?? cifras?.movimientos?.rotacionPorcentaje

  const kpis = [
    {
      titulo: 'Ausencias de hoy',
      valor: cifras?.ausenciasDelDia?.total ?? cifras?.ausentesHoy?.total ?? '—',
    },
    {
      titulo: 'Solicitudes pendientes',
      valor: cifras?.solicitudesPendientes?.total ?? solicitudes.length,
    },
    {
      titulo: 'Incapacidades',
      valor:
        cifras?.incapacidadesActivas?.activas ?? cifras?.incapacidades?.activas ?? '—',
    },
    {
      titulo: 'Rotación reciente',
      valor: rotacion == null ? '—' : Number(rotacion).toFixed(1),
      sufijo: rotacion == null ? '' : '%',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-100">Dashboard de RRHH</h2>
        <p className="text-sm text-slate-500">Indicadores y reportes del área de talento humano</p>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.titulo} {...kpi} />
        ))}
      </section>

      <ExecutiveSummary resumen={resumen} fecha={reporte?.fecha} />

      <CollaboratorReports
        colaboradores={cifras?.porColaborador || []}
        seleccionado={colaboradorSeleccionado}
        onSeleccionar={setColaboradorSeleccionado}
      />

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <h3 className="mb-4 font-semibold text-slate-100">Tendencia de los últimos 30 días</h3>
        <TrendChart datos={tendencia} />
      </section>

      <PendingTable solicitudes={solicitudes} onCambiarEstado={cambiarEstado} />

      <ReportHistory
        reportes={historial}
        onSeleccionar={seleccionarReporte}
        activoId={reporteActivoId}
      />
    </div>
  )
}
