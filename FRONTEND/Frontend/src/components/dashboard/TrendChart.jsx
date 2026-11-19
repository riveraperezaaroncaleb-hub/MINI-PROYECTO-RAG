import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const cortaFecha = (fecha) =>
  new Date(fecha).toLocaleDateString('es', { day: '2-digit', month: '2-digit' })

export default function TrendChart({ datos }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={datos} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
          <XAxis dataKey="fecha" tickFormatter={cortaFecha} stroke="#64748b" fontSize={11} />
          <YAxis stroke="#64748b" fontSize={11} />
          <Tooltip
            contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }}
            labelFormatter={(valor) => new Date(valor).toLocaleDateString('es')}
          />
          <Legend />
          <Line type="monotone" dataKey="ausencias" name="Ausencias" stroke="#34d399" dot={false} />
          <Line type="monotone" dataKey="pendientes" name="Pendientes" stroke="#f59e0b" dot={false} />
          <Line type="monotone" dataKey="incapacidades" name="Incapacidades" stroke="#f43f5e" dot={false} />
          <Line type="monotone" dataKey="rotacion" name="Rotación %" stroke="#818cf8" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
