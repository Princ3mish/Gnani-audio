import { useParams } from 'react-router-dom';

export default function NoteDetail() {
  const { id } = useParams<{ id: string }>();
  return (
    <div>
      <h1>Note detail</h1>
      <p>Note ID: {id}</p>
    </div>
  );
}
