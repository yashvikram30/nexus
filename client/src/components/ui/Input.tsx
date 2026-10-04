interface InputProps {
    placeholder : string,
    reference?: React.RefObject<HTMLInputElement>,
    classes?: string,
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
}

const Input = (props: InputProps) => {
  return (
    <input type="text" placeholder={props.placeholder} ref={props.reference} onChange={props.onChange} className={props.classes ?  props.classes : "px-4 py-2 border rounded m-2 w-10/12 "} />
  )
}

export default Input
