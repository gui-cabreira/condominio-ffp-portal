import { useState } from 'react';
import { RotateCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export const LoopNode = ({ data }: { data: any }) => {
  const [maxIterations, setMaxIterations] = useState(data.maxIterations || 3);
  const [conditionType, setConditionType] = useState(data.conditionType || 'count');

  const handleMaxIterationsChange = (value: number) => {
    setMaxIterations(value);
    data.maxIterations = value;
  };

  const handleConditionTypeChange = (value: string) => {
    setConditionType(value);
    data.conditionType = value;
  };

  return (
    <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4 min-w-[220px] shadow-md">
      <div className="flex items-center gap-2 mb-3">
        <RotateCw className="w-4 h-4 text-purple-600" />
        <span className="font-semibold text-sm">Loop / Repetição</span>
      </div>
      
      <div className="space-y-3">
        <div>
          <label className="text-xs text-gray-600 mb-1 block">Condição</label>
          <Select value={conditionType} onValueChange={handleConditionTypeChange}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="count">Número de vezes</SelectItem>
              <SelectItem value="until_response">Até resposta</SelectItem>
              <SelectItem value="until_payment">Até pagamento</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {conditionType === 'count' && (
          <div>
            <label className="text-xs text-gray-600 mb-1 block">Repetir</label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={maxIterations}
                onChange={(e) => handleMaxIterationsChange(parseInt(e.target.value) || 1)}
                className="w-16 h-8 text-center text-sm"
                min="1"
                max="10"
              />
              <span className="text-xs text-gray-600">vezes</span>
            </div>
          </div>
        )}
      </div>

      {/* Handles para conexões */}
      <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-blue-500 rounded-full"></div>
      <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-blue-500 rounded-full"></div>
      
      {/* Handle lateral para retorno do loop */}
      <div className="absolute top-1/2 -left-2 transform -translate-y-1/2 w-3 h-3 bg-purple-500 rounded-full" title="Ponto de retorno do loop"></div>
    </div>
  );
};