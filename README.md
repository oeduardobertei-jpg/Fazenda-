# Fazenda Viva — versão 0.8.0

Simulador de fazendas, cabanhas e economia rural para navegador, com expansão autônoma de quatro propriedades vizinhas e criação de cavalos.

## Jogar

**GitHub Pages:** https://oeduardobertei-jpg.github.io/Fazenda-/

O jogo é publicado via `main` / raiz no GitHub Pages. Após um commit, aguarde o deploy e atualize a página.

## Novidades da 0.8

- **Território ampliado:** região de aproximadamente 1.300 × 1.200 unidades, com cinco propriedades separadas por grandes intervalos.
- **Delimitação de glebas:** cada fazenda dispõe de área cercada; novas construções respeitam os limites e preservam a separação entre estruturas.
- **Dois renderizadores:** Three.js/WebGL 3D preferencial, com fallback 2D em Canvas se o módulo ou WebGL não estiver disponível.
- **Cena 3D:** terreno, árvores em InstancedMesh, estradas de terra, açudes, lavouras, cercas, casas, cocheiras, galpões, piquetes e cavalos com volumes.
- **Expansão:** NPCs continuam construindo e ampliando as propriedades com validação de ocupação.
- **Compatibilidade dos salvamentos:** a primeira abertura migra dados do armazenamento `fazenda-viva-v040` para `fazenda-viva-v080`, deslocando as construções antigas para as novas glebas. O registro anterior é mantido.
- **Navegação:** botão `Mapa` oferece visão regional; `Fazenda` volta à propriedade principal; `Visitar outra fazenda` alterna entre as cinco propriedades.

## Controles

- **Arrastar:** mover a câmera;
- **Pinça (dois dedos):** zoom;
- **Mapa / Fazenda:** vista geral ou retorno ao centro da cabanha;
- **Construir:** selecionar uma estrutura e tocar em terreno disponível dentro da sua propriedade;
- **Comprar cavalo:** exige recursos e capacidade disponível;
- **Pausar / velocidade:** controlar o andamento da economia e das IAs;
- **Modo 3D / Modo 2D:** alternar entre WebGL e o renderizador de compatibilidade.

## Estrutura

- `index.html`: HUD responsivo, estado do jogo, renderizador Canvas 2D de compatibilidade, economia, construção, IA, controles e salvamento.
- `world3d.js`: renderizador Three.js, instâncias de vegetação, cenário 3D e botão de alternância.

## Observações

O Three.js é carregado dinamicamente a partir de um CDN público fixado na versão 0.165.0, com CDN alternativo de reserva. **O jogo continua acessível em 2D** se o módulo/WebGL não carregar, mas o modo 3D precisa de acesso à rede no primeiro carregamento. Ainda há elementos visuais provisórios e não foram realizados testes físicos em todos os aparelhos.

A 0.8 é uma etapa de arquitetura e renderização. As fases 0.9/1.0 ainda precisam de validação mobile, aperfeiçoamento visual, balanceamento, testes de usabilidade e de desempenho.
