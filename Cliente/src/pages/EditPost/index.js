import { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import Editor from "../../components/Editor";

export default function EditPost() {
  const { id } = useParams(); // Obtendo o id da URL
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [files, setFiles] = useState('');
  const [redirect, setRedirect] = useState(false);

  // Verifica se o ID está presente na URL e busca os dados do post
  useEffect(() => {
    if (!id) {
      return <Navigate to="/" />; // Redireciona caso o id não seja encontrado
    }

    fetch('http://localhost:4000/post/' + id)
      .then(response => response.json())
      .then(postInfo => {
        if (postInfo) {
          setTitle(postInfo.title);
          setContent(postInfo.content);
          setSummary(postInfo.summary);
        }
      })
      .catch(error => {
        console.error("Erro ao buscar o post:", error);
      });
  }, [id]); // Dependência do id para refazer a requisição caso o id mude

  // Função para atualizar o post
  async function updatePost(ev) {
    ev.preventDefault();
    
    // Criar FormData para envio de dados, incluindo arquivos
    const data = new FormData();
    data.set('title', title);
    data.set('summary', summary);
    data.set('content', content);
    data.set('id', id); // Envia o id do post para atualização

    if (files?.[0]) {
      data.set('file', files[0]); // Envia o arquivo se presente
    }

    // Enviar a requisição PUT para atualizar o post
    const response = await fetch('http://localhost:4000/post', {
      method: 'PUT',
      body: data,
      credentials: 'include', // Inclui o token de autenticação no cabeçalho
    });

    if (response.ok) {
      setRedirect(true); // Redireciona se a atualização for bem-sucedida
    } else {
      console.error("Erro ao atualizar o post");
    }
  }

  // Função para excluir o post
  async function deletePost() {
    const response = await fetch(`http://localhost:4000/post/${id}`, {
      method: 'DELETE',
      credentials: 'include', // Inclui o token de autenticação no cabeçalho
    });

    if (response.ok) {
      setRedirect(true); // Redireciona se a exclusão for bem-sucedida
    }
  }

  // Redireciona para a página inicial após a atualização ou exclusão
  if (redirect) {
    return <Navigate to="/" />;
  }

  return (
    <form onSubmit={updatePost}>
      <input
        type="text"
        placeholder="Título"
        value={title}
        onChange={ev => setTitle(ev.target.value)} />
      
      <input
        type="text"
        placeholder="Descrição"
        value={summary}
        onChange={ev => setSummary(ev.target.value)} />

      <input
        type="file"
        onChange={ev => setFiles(ev.target.files)} />

      <Editor onChange={setContent} value={content} />

      <button style={{ marginTop: '5px' }}>Atualizar Post</button>

      <button
        type="button"
        onClick={deletePost}
        style={{ marginTop: '5px', backgroundColor: 'red', color: 'white' }}>
        Deletar Post
      </button>
    </form>
  );
}
