document.getElementById('saveForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const localizacao = document.getElementById('localizacao').value;
    const desafio = document.getElementById('desafio').value;

    fetch('saves.json')
        .then(response => response.json())
        .then(data => {
            const resultado = data.find(save => 
                save.localizacao === localizacao && 
                save.desafio === desafio
            );

            const resultadoDiv = document.getElementById('resultado');
            if (resultado) {
                resultadoDiv.innerHTML = `
                    <h2>Save Recomendada: ${resultado.nome}</h2>
                    <p>${resultado.descricao}</p>
                    <a href="${resultado.link}" target="_blank">Baixar Save</a>
                `;
            } else {
                resultadoDiv.innerHTML = `<p>Nenhum save encontrado com essas preferências.</p>`;
            }
            resultadoDiv.style.display = 'block';
        })
        .catch(error => {
            console.error('Erro ao carregar os saves:', error);
        });
});
