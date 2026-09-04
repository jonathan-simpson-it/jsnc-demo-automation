interface Props {
  tags: readonly string[];
}

export default function ChipList({ tags }: Props) {
  return (
    <ul className="chip-list" role="list">
      {tags.map((tag) => (
        <li key={tag}>{tag}</li>
      ))}
    </ul>
  );
}
