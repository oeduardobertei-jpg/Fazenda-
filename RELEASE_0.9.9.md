# Fazenda Viva 0.9.9 — revisão equina e pastoreio

## Motivo
As capturas Android da 0.9.8 apontam linguagem pouco familiar (“gleba”), quatro bancas aparentemente vazias e cavalos pouco convincentes e restritos a órbitas de menos de um metro. O Centro Rural das três capturas é o mesmo local com eventos diferentes; suas funções econômicas já existiam em Gestão → Mercado.

## Entrega
Propriedade no guia; bancas com bens/comerciantes e toque direto para o mercado. Formas equinas compartilhadas pelos dois renderizadores, sem GLB externo nem texturas grandes. Rotina automática de piquete/campo/pasto/descanso/retorno dentro da fazenda, com caminhos planejados sob demanda, grades em cache e reserva de porteira para novas obras. Animais novos e transferidos são posicionados antes da renderização. Construções não reinicializam todo o plantel.

O tratador escolhe um ponto acessível perto da área de manejo do paciente, aguarda o retorno e só então pode concluir o atendimento e consumir uma porção de ração. Cavalos esperam ou contornam outros animais em campo. Não há bônus financeiro artificial pelo passeio nem novas necessidades de NPCs.

## Verificação
- Automatizada: simulação econômica prolongada, poses, ciclo de renderização simulado e matrizes/buffers oficiais Three.js sem GPU. A simulação verifica circulação contínua, ausência de teletransporte na mesma fazenda, limites, edifícios, portões, exploração superior a 30 unidades por propriedade e retorno ao manejo, mantendo os testes econômicos anteriores.
- Navegador: execução Chromium/WebGL e cinco viewports pelo workflow de QA; capturas incluem cavalo próximo, Centro Rural, Canvas e interface. Resultado e inspeção visual serão registrados após a execução.
- Android físico: as capturas recebidas são da 0.9.8. A naturalidade da 0.9.9 em movimento, sessão prolongada, FPS, calor e consumo ainda precisam de observação no dispositivo.

## Limites preservados
Modelo procedural estilizado; não é um rig de animação importado. Piquetes permanecem áreas de manejo; a liberdade acontece dentro dos limites da propriedade, sem invasão de lavouras externas, estradas públicas, açudes ou fazendas vizinhas. Venda externa remove o animal conforme a regra econômica existente; transferências regionais levam o mesmo indivíduo à fazenda compradora. O passeio não simula transporte rodoviário de animais.

Sem salvamento automático. Novas partidas começam no dia 1. Os critérios de lançamento da 1.0 seguem abertos.
