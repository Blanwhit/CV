function toggleTheme ()
{
    const html = document.documentElement;
    const currentTheme = html.getAttribute( 'data-theme' );
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';

    html.setAttribute( 'data-theme', newTheme );

    // Toggle icon
    const icon = document.querySelector( '.theme-toggle i' );
    if ( newTheme === 'dark' )
    {
        icon.classList.remove( 'fa-moon' );
        icon.classList.add( 'fa-sun' );
    } else
    {
        icon.classList.remove( 'fa-sun' );
        icon.classList.add( 'fa-moon' );
    }

    // Store preference
    localStorage.setItem( 'theme', newTheme );
}

// Load saved theme preference
document.addEventListener( 'DOMContentLoaded', () =>
{
    const savedTheme = localStorage.getItem( 'theme' ) || 'dark';
    document.documentElement.setAttribute( 'data-theme', savedTheme );

    // Set correct icon
    const icon = document.querySelector( '.theme-toggle i' );
    if ( savedTheme === 'dark' )
    {
        icon.classList.remove( 'fa-moon' );
        icon.classList.add( 'fa-sun' );
    }
} );

function toggleColorPicker ()
{
    const popup = document.getElementById( 'colorPopup' );
    popup.style.display = 'grid';
    if ( popup.classList.contains( 'show' ) )
    {
        popup.classList.remove( 'show' );
    } else
    {
        setTimeout( () =>
        {
            popup.classList.add( 'show' );
        }, 1 );
    }
}

function changeColor ( primary, dark )
{
    document.documentElement.style.setProperty( '--primary-color', primary );
    document.documentElement.style.setProperty( '--primary-dark', dark );

    document.getElementById( 'favicon' ).href = `https://api.iconify.design/f7/book-fill.svg?color=%23${ primary.substring( 1 ) } `;

    // Store color preference
    localStorage.setItem( 'primary-color', primary );
    localStorage.setItem( 'primary-dark', dark );

    // Hide color picker after selection
    document.getElementById( 'colorPopup' ).style.display = 'none';
}

// Load saved color preference
document.addEventListener( 'DOMContentLoaded', () =>
{
    const savedPrimary = localStorage.getItem( 'primary-color' );
    const savedDark = localStorage.getItem( 'primary-dark' );
    if ( savedPrimary && savedDark )
    {
        changeColor( savedPrimary, savedDark );
    }

    // Close color picker when clicking outside
    document.addEventListener( 'click', ( e ) =>
    {
        const popup = document.getElementById( 'colorPopup' );
        const colorToggle = document.querySelector( '.color-toggle' );
        if ( !popup.contains( e.target ) && !colorToggle.contains( e.target ) )
        {
            popup.style.display = 'none';
        }
    } );
} );