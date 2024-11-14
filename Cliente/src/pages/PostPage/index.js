import { useContext, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { formatISO9075 } from "date-fns"; // Importação ajustada
import { UserContext } from "../../components/UserContext";

export default function PostPage() {
  const [postInfo, setPostInfo] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [error, setError] = useState(null);
  const { userInfo } = useContext(UserContext);
  const { id } = useParams();

  useEffect(() => {
    fetch(`http://localhost:4000/post/${id}`)
      .then(response => response.json())
      .then(postInfo => setPostInfo(postInfo))
      .catch(error => setError("Erro ao carregar post."));
  
    fetch(`http://localhost:4000/post/${id}/comment`)
      .then(response => response.json())
      .then(data => setComments(Array.isArray(data) ? data : []))
      .catch(error => setError("Erro ao carregar comentários."));
  }, [id]);

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
  
    try {
      const response = await fetch(`http://localhost:4000/post/${id}/comment`, { 
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ content: commentText }),
      });
  
      if (response.ok) {
        const updatedComments = await fetch(`http://localhost:4000/post/${id}/comment`) 
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
        const response = await fetch(`http://localhost:4000/post/${id}/comment/${commentId}`, {
            method: "DELETE",
            credentials: "include",
        });

        if (response.ok) {
            setComments(comments.filter(comment => (comment._id || comment.id) !== commentId));
        } else {
            throw new Error("Erro ao excluir comentário");
        }
    } catch (error) {
        setError("Erro ao excluir comentário");
    }
};
  
  if (error) return <div>{error}</div>;
  if (!postInfo) return <div>Carregando...</div>;

  // Formata a data usando formatISO9075
  const formattedDate = formatISO9075(new Date(postInfo.createdAt));

  return (
    <div className="post-page">
      <h1>{postInfo.title}</h1>
      <time>{formattedDate}</time>
      <div className="author">Criado por: {postInfo.author.username || 'Autor desconhecido'}</div>

      {userInfo && (userInfo.id === (postInfo.author._id || postInfo.authorId)) && (
        <div className="edit-row">
          <Link className="edit-btn" to={`/edit/${postInfo._id}`}>
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
          <div key={comment._id || comment.id} className="comment">
            <span className="author">{comment.author.username || "Anônimo"}</span>
            <p>{comment.content}</p>

        {console.log("userInfo:", userInfo, "comment.authorId:", comment.authorId)}

        {userInfo && (userInfo.id === (comment.author._id || comment.authorId)) && (
          <button onClick={() => handleDeleteComment(comment._id || comment.id)}>Excluir</button>
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
