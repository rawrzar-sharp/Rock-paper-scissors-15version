import random

# The 15 gestures in the specific order of the game circle
GESTURES = [
    "Rock", "Fire", "Scissors", "Snake", "Human", 
    "Tree", "Wolf", "Sponge", "Paper", "Air", 
    "Water", "Dragon", "Devil", "Lightning", "Gun"
]

def play_game():
    print("--- Welcome to Rock Paper Scissors 15! ---")
    print(f"Options: {', '.join(GESTURES)}")
    
    # 1. Get Player Input
    user_choice = input("\nPick your gesture: ").strip().capitalize()
    
    if user_choice not in GESTURES:
        print("Invalid choice! Make sure you spelled it correctly.")
        return

    # 2. Get Computer Input
    computer_choice = random.choice(GESTURES)
    print(f"Computer chose: {computer_choice}")

    # 3. Determine the Winner
    if user_choice == computer_choice:
        print("It's a tie!")
    else:
        idx_user = GESTURES.index(user_choice)
        idx_comp = GESTURES.index(computer_choice)
        
        # Determine winner using the intended 15-gesture matchup table.
        # Each gesture beats the next 7 gestures in the given circle direction.
        # If the computer is within the 7 gestures that the player's choice beats,
        # then the player wins; otherwise the computer wins.
        diff = (idx_comp - idx_user + 15) % 15  # 0..14 steps from user to computer (clockwise)

        if 1 <= diff <= 7:
            print(f"Result: {computer_choice} beats {user_choice}. You lose!")
        else:
            print(f"Result: {user_choice} beats {computer_choice}. You win!")

def main():
    while True:
        play_game()
        again = input("\nPlay again? (y/n): ").strip().lower()
        if again != "y":
            print("Thanks for playing!")
            break


if __name__ == "__main__":
    main()
