import { useContext, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale/";
import { UserContext } from "../../components/UserContext";

const formatDate = (timestamp) => {
  try {
    if (timestamp && typeof timestamp === 'object' && '_seconds' in timestamp) {
      const date = new Date(timestamp._seconds * 1000);
      return format(date, "dd 'de' MMM 'de' yyyy 'às' HH:mm", { locale: ptBR });
    } else if (typeof timestamp === 'string') {
      return timestamp;
    }
    return 'Data indisponível';
  } catch (error) {
    console.error("Erro ao formatar data:", error);
    return 'Data inválida';
  }
};

export default function PostPage() {
  const [postInfo, setPostInfo] = useState(null);
  const [comments, setComments] = useState([]); // Inicializa como array vazio
  const [commentText, setCommentText] = useState("");
  const [error, setError] = useState(null);
  const { userInfo } = useContext(UserContext);
  const { id } = useParams();

  useEffect(() => {
    fetch(`http://localhost:4000/post/${id}`)
      .then(response => response.json())
      .then(postInfo => setPostInfo(postInfo))
      .catch(error => setError("Erro ao carregar post."));

    fetch(`http://localhost:4000/post/${id}/comments`)
      .then(response => response.json())
      .then(data => setComments(Array.isArray(data) ? data : [])) // Confirma que `data` é um array
      .catch(error => setError("Erro ao carregar comentários."));
  }, [id]);

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
  
    try {
      const response = await fetch(`http://localhost:4000/post/${id}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ content: commentText }),
      });
  
      if (response.ok) {
        const updatedComments = await fetch(`http://localhost:4000/post/${id}/comments`)
          .then(res => res.json());
        
        setComments(Array.isArray(updatedComments) ? updatedComments : []);
        setCommentText("");
      } else {
        throw new Error("Erro ao adicionar comentário");
      }
    } catch (error) {
      setError("Erro ao adicionar comentário");
    }
  };
  
  const handleDeleteComment = async (commentId) => {
    try {
      const response = await fetch(`http://localhost:4000/post/${id}/comments/${commentId}`, {
        method: "DELETE",
        credentials: "include",
      });
  
      if (response.ok) {
        setComments(comments.filter(comment => comment.id !== commentId));
      } else {
        throw new Error("Erro ao excluir comentário");
      }
    } catch (error) {
      setError("Erro ao excluir comentário");
    }
  };

  if (error) return <div>{error}</div>;
  if (!postInfo) return <div>Carregando...</div>;

  const formattedDate = postInfo.createdAt ? formatDate(postInfo.createdAt) : 'Data indisponível';

  return (
    <div className="post-page">
      <h1>{postInfo.title}</h1>
      <time>{formattedDate}</time>
      <div className="author">Criado por: {postInfo.authorEmail || 'Autor desconhecido'}</div>

      {userInfo && userInfo.id === postInfo.authorId && (
        <div className="edit-row">
          <Link className="edit-btn" to={`/edit/${postInfo.id}`}>
            Editar esse Post
          </Link>
        </div>
      )}

      <div className="image">
        <img src={`http://localhost:4000/${postInfo.cover}`} alt="Post Cover" />
      </div>
      <div className="content" dangerouslySetInnerHTML={{ __html: postInfo.content }} />

      <div className="comments-section">
        <h2>Comentários</h2>
        {Array.isArray(comments) && comments.length > 0 ? (
          comments.map((comment) => (
            <div key={comment.id} className="comment">
              <span className="author">Comentário de: {comment.authorEmail || "Anônimo"}</span>
              <p>{comment.content}</p>
              {userInfo && userInfo.id === comment.authorId && (
                <button onClick={() => handleDeleteComment(comment.id)}>Excluir</button>
              )}
            </div>
          ))
        ) : (
          <p>Não há comentários ainda.</p>
        )}

        {userInfo ? (
          <form onSubmit={handleCommentSubmit}>
            <textarea
              placeholder="Escreva seu comentário..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
            />
            <button type="submit">Comentar</button>
          </form>
        ) : (
          <p>Faça login para comentar.</p>
        )}
      </div>
    </div>
  );
}
